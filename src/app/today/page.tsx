'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { DateStrip } from '@/components/DateStrip';
import { MacroSummary } from '@/components/MacroSummary';
import { WaterTracker } from '@/components/WaterTracker';
import { MealCard } from '@/components/MealCard';
import { Composer } from '@/components/Composer';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { computeDayTotals, computeStreak, dateKey, ML_PER_CUP } from '@/lib/calories';
import type { AiResponse, CalorieLog, ChatMessage, DayTotals, Profile } from '@/lib/types';

function dayTotalsFromLogs(dayLogs: CalorieLog[], profile: Profile | null): DayTotals {
  return computeDayTotals(dayLogs, profile);
}

export default function TodayPage() {
  const { user, profile } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [selected, setSelected] = useState(() => new Date());
  const [logs, setLogs] = useState<CalorieLog[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loggedDates, setLoggedDates] = useState<Set<string>>(new Set());
  const [allLogDates, setAllLogDates] = useState<string[]>([]);
  const [cups, setCups] = useState(0);
  const [busy, setBusy] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const selectedKey = dateKey(selected);

  const totals = useMemo(() => computeDayTotals(logs, profile), [logs, profile]);
  const streak = useMemo(() => computeStreak(allLogDates), [allLogDates]);

  const loadDay = useCallback(async () => {
    if (!user) return;

    const [{ data: dayLogs }, { data: dayMessages }, { data: water }, { data: monthLogs }] =
      await Promise.all([
        supabase
          .from('calorie_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('log_date', selectedKey)
          .order('created_at', { ascending: true }),
        supabase
          .from('chat_messages')
          .select('*')
          .eq('user_id', user.id)
          .eq('log_date', selectedKey)
          .order('created_at', { ascending: true }),
        supabase
          .from('water_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('log_date', selectedKey)
          .maybeSingle(),
        supabase.from('calorie_logs').select('log_date').eq('user_id', user.id),
      ]);

    setLogs((dayLogs as CalorieLog[]) || []);
    const cleaned = ((dayMessages as ChatMessage[]) || []).filter(
      (m) =>
        !(
          m.sender === 'assistant' &&
          /GoogleGenerativeAI Error|429 Too Many Requests|gemini-2\.0-flash|gagal memproses/i.test(
            m.message_text || ''
          )
        )
    );
    setMessages(cleaned);
    setCups(water?.cups ?? 0);

    const dates = (monthLogs || []).map((r: { log_date: string }) => r.log_date);
    setAllLogDates(dates);
    setLoggedDates(new Set(dates));
  }, [user, selectedKey, supabase]);

  useEffect(() => {
    void loadDay();
  }, [loadDay]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const updateWater = async (nextCups: number) => {
    if (!user) return;
    setCups(nextCups);
    const ml = nextCups * ML_PER_CUP;
    await supabase.from('water_logs').upsert(
      {
        user_id: user.id,
        log_date: selectedKey,
        cups: nextCups,
        ml,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,log_date' }
    );
  };

  const handleSend = async (payload: {
    text: string;
    imageBase64?: string;
    imageType?: string;
    imageFile?: File;
  }) => {
    if (!user || !profile) return;
    setBusy(true);
    try {
      let imageUrl: string | null = null;

      if (payload.imageFile) {
        const ext = payload.imageFile.name.split('.').pop() || 'jpg';
        const path = `${user.id}/${selectedKey}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('food-photos')
          .upload(path, payload.imageFile, { upsert: false });
        if (!upErr) {
          const { data: pub } = supabase.storage.from('food-photos').getPublicUrl(path);
          imageUrl = pub.publicUrl;
        }
      }

      const { data: userMsg, error: userMsgErr } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          log_date: selectedKey,
          sender: 'user',
          message_text: payload.text,
          image_url: imageUrl,
        })
        .select('*')
        .single();

      if (userMsgErr) throw userMsgErr;
      setMessages((prev) => [...prev, userMsg as ChatMessage]);

      const history = [...messages, userMsg].map((m) => ({
        sender: m.sender,
        message_text: m.message_text,
      }));

      const aiRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: payload.text,
          image: payload.imageBase64,
          imageType: payload.imageType,
          history: history.filter((h) => !/gagal memproses|GoogleGenerativeAI|kuota/i.test(h.message_text || '')),
          userProfile: profile,
          dayTotals: {
            foodCalories: totals.foodCalories,
            exerciseCalories: totals.exerciseCalories,
            remaining: totals.remaining,
            protein: totals.protein,
            carbs: totals.carbs,
            fat: totals.fat,
          },
        }),
      });

      const aiJson = (await aiRes.json()) as AiResponse & { error?: string };
      if (!aiRes.ok) throw new Error(aiJson.error || 'AI gagal');

      const { data: assistantMsg, error: asErr } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          log_date: selectedKey,
          sender: 'assistant',
          message_text: aiJson.reply,
          structured_data: aiJson,
        })
        .select('*')
        .single();

      if (asErr) throw asErr;
      setMessages((prev) => [...prev, assistantMsg as ChatMessage]);

      const inserts: Omit<CalorieLog, 'id' | 'created_at'>[] = [];

      for (const item of aiJson.foodItems || []) {
        inserts.push({
          user_id: user.id,
          log_date: selectedKey,
          type: 'food',
          name: item.name,
          calories: Math.round(item.calories || 0),
          protein: item.protein || 0,
          carbs: item.carbs || 0,
          fat: item.fat || 0,
          serving: item.serving || null,
          duration_minutes: null,
          message_id: assistantMsg.id,
        });
      }

      for (const item of aiJson.exerciseItems || []) {
        inserts.push({
          user_id: user.id,
          log_date: selectedKey,
          type: 'exercise',
          name: item.name,
          calories: Math.round(item.caloriesBurned || 0),
          protein: 0,
          carbs: 0,
          fat: 0,
          serving: null,
          duration_minutes: item.durationMinutes || null,
          message_id: assistantMsg.id,
        });
      }

      if (inserts.length) {
        const { data: newLogs, error: logErr } = await supabase
          .from('calorie_logs')
          .insert(inserts)
          .select('*');
        if (logErr) throw logErr;
        setLogs((prev) => [...prev, ...((newLogs as CalorieLog[]) || [])]);
        setLoggedDates((prev) => new Set(prev).add(selectedKey));
        setAllLogDates((prev) => [...prev, selectedKey]);
      }
    } catch (err) {
      console.error(err);
      const raw = err instanceof Error ? err.message : '';
      // Soft recovery: try local estimate client-side so logging never dead-ends
      try {
        const { estimateLocally } = await import('@/lib/localEstimate');
        const local = estimateLocally(payload.text || '', Number(profile.weight) || 70);
        const { data: assistantMsg } = await supabase
          .from('chat_messages')
          .insert({
            user_id: user.id,
            log_date: selectedKey,
            sender: 'assistant',
            message_text: local.reply,
            structured_data: local,
          })
          .select('*')
          .single();
        if (assistantMsg) {
          setMessages((prev) => [...prev, assistantMsg as ChatMessage]);
          const inserts = [
            ...(local.foodItems || []).map((item) => ({
              user_id: user.id,
              log_date: selectedKey,
              type: 'food' as const,
              name: item.name,
              calories: Math.round(item.calories || 0),
              protein: item.protein || 0,
              carbs: item.carbs || 0,
              fat: item.fat || 0,
              serving: item.serving || null,
              duration_minutes: null,
              message_id: assistantMsg.id,
            })),
            ...(local.exerciseItems || []).map((item) => ({
              user_id: user.id,
              log_date: selectedKey,
              type: 'exercise' as const,
              name: item.name,
              calories: Math.round(item.caloriesBurned || 0),
              protein: 0,
              carbs: 0,
              fat: 0,
              serving: null,
              duration_minutes: item.durationMinutes || null,
              message_id: assistantMsg.id,
            })),
          ];
          if (inserts.length) {
            const { data: newLogs } = await supabase.from('calorie_logs').insert(inserts).select('*');
            if (newLogs) {
              setLogs((prev) => [...prev, ...((newLogs as CalorieLog[]) || [])]);
              setLoggedDates((prev) => new Set(prev).add(selectedKey));
              setAllLogDates((prev) => [...prev, selectedKey]);
            }
          }
          return;
        }
      } catch (fallbackErr) {
        console.error('local fallback failed', fallbackErr);
      }

      const reply = /429|kuota|quota|Too Many|404|no longer available/i.test(raw)
        ? 'AI cloud sedang bermasalah. Coba kirim lagi — sistem pakai estimasi lokal.'
        : raw
          ? `Maaf, gagal menyimpan: ${raw.slice(0, 180)}`
          : 'Maaf, ada masalah. Coba lagi ya.';
      const { data: errMsg } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          log_date: selectedKey,
          sender: 'assistant',
          message_text: reply,
          structured_data: { type: 'chat', reply },
        })
        .select('*')
        .single();
      if (errMsg) setMessages((prev) => [...prev, errMsg as ChatMessage]);
    } finally {
      setBusy(false);
    }
  };

  const logsByMessage = useMemo(() => {
    const map = new Map<string, CalorieLog[]>();
    for (const log of logs) {
      if (!log.message_id) continue;
      const list = map.get(log.message_id) || [];
      list.push(log);
      map.set(log.message_id, list);
    }
    return map;
  }, [logs]);

  const upsertAssistantMessage = async (
    assistantMsg: ChatMessage | undefined,
    aiJson: AiResponse
  ): Promise<ChatMessage> => {
    if (assistantMsg) {
      const { data: updatedAsst, error: asErr } = await supabase
        .from('chat_messages')
        .update({
          message_text: aiJson.reply,
          structured_data: aiJson,
        })
        .eq('id', assistantMsg.id)
        .select('*')
        .maybeSingle();

      if (asErr) throw asErr;

      if (updatedAsst) {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsg.id ? (updatedAsst as ChatMessage) : m))
        );
        return updatedAsst as ChatMessage;
      }

      // UPDATE blocked (missing RLS) or row gone — replace via delete + insert
      await supabase.from('chat_messages').delete().eq('id', assistantMsg.id);
    }

    const { data: newAsst, error: insErr } = await supabase
      .from('chat_messages')
      .insert({
        user_id: user!.id,
        log_date: selectedKey,
        sender: 'assistant',
        message_text: aiJson.reply,
        structured_data: aiJson,
      })
      .select('*')
      .single();
    if (insErr) throw insErr;

    if (assistantMsg) {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsg.id ? (newAsst as ChatMessage) : m))
      );
    } else {
      setMessages((prev) => [...prev, newAsst as ChatMessage]);
    }
    return newAsst as ChatMessage;
  };

  const handleEditUserMessage = async (
    userMsg: ChatMessage,
    assistantMsg: ChatMessage | undefined,
    newText: string
  ) => {
    if (!user || !profile) return;
    setBusy(true);
    try {
      const { data: updatedUser, error: userUpdErr } = await supabase
        .from('chat_messages')
        .update({ message_text: newText })
        .eq('id', userMsg.id)
        .select('*')
        .maybeSingle();

      if (userUpdErr) throw userUpdErr;

      // If UPDATE policy missing, keep optimistic text in UI
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMsg.id
            ? { ...m, ...(updatedUser || {}), message_text: newText }
            : m
        )
      );

      // Remove old logs for this pair so day totals exclude them during recalculate
      if (assistantMsg) {
        await supabase.from('calorie_logs').delete().eq('message_id', assistantMsg.id);
      }
      const logsWithoutPair = assistantMsg
        ? logs.filter((l) => l.message_id !== assistantMsg.id)
        : logs;
      setLogs(logsWithoutPair);
      const baseTotals = dayTotalsFromLogs(logsWithoutPair, profile);

      const history = messages
        .filter((m) => m.id !== assistantMsg?.id)
        .map((m) =>
          m.id === userMsg.id
            ? { sender: m.sender, message_text: newText }
            : { sender: m.sender, message_text: m.message_text }
        )
        .filter((h) => !/gagal memproses|GoogleGenerativeAI|kuota/i.test(h.message_text || ''));

      const aiRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newText,
          history,
          userProfile: profile,
          dayTotals: {
            foodCalories: baseTotals.foodCalories,
            exerciseCalories: baseTotals.exerciseCalories,
            remaining: baseTotals.remaining,
            protein: baseTotals.protein,
            carbs: baseTotals.carbs,
            fat: baseTotals.fat,
          },
        }),
      });

      const aiJson = (await aiRes.json()) as AiResponse & { error?: string };
      if (!aiRes.ok) throw new Error(aiJson.error || 'AI gagal hitung ulang');

      const targetAssistant = await upsertAssistantMessage(assistantMsg, aiJson);

      const inserts: Omit<CalorieLog, 'id' | 'created_at'>[] = [
        ...(aiJson.foodItems || []).map((item) => ({
          user_id: user.id,
          log_date: selectedKey,
          type: 'food' as const,
          name: item.name,
          calories: Math.round(item.calories || 0),
          protein: item.protein || 0,
          carbs: item.carbs || 0,
          fat: item.fat || 0,
          serving: item.serving || null,
          duration_minutes: null,
          message_id: targetAssistant.id,
        })),
        ...(aiJson.exerciseItems || []).map((item) => ({
          user_id: user.id,
          log_date: selectedKey,
          type: 'exercise' as const,
          name: item.name,
          calories: Math.round(item.caloriesBurned || 0),
          protein: 0,
          carbs: 0,
          fat: 0,
          serving: null,
          duration_minutes: item.durationMinutes || null,
          message_id: targetAssistant.id,
        })),
      ];

      if (inserts.length) {
        const { data: newLogs, error: logErr } = await supabase
          .from('calorie_logs')
          .insert(inserts)
          .select('*');
        if (logErr) throw logErr;
        setLogs([...logsWithoutPair, ...((newLogs as CalorieLog[]) || [])]);
        setLoggedDates((prev) => new Set(prev).add(selectedKey));
        setAllLogDates((prev) => [...prev, selectedKey]);
      }
    } catch (err) {
      console.error(err);
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : err instanceof Error
            ? err.message
            : 'Gagal menghitung ulang';
      alert(msg);
      await loadDay();
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteUserMessage = async (
    userMsg: ChatMessage,
    assistantMsg: ChatMessage | undefined
  ) => {
    if (!confirm('Hapus chat ini beserta catatannya? Total hari ini akan dihitung ulang.')) return;
    setBusy(true);
    try {
      if (assistantMsg) {
        await supabase.from('calorie_logs').delete().eq('message_id', assistantMsg.id);
        await supabase.from('chat_messages').delete().eq('id', assistantMsg.id);
      }
      await supabase.from('chat_messages').delete().eq('id', userMsg.id);

      const nextLogs = assistantMsg
        ? logs.filter((l) => l.message_id !== assistantMsg.id)
        : logs;
      setLogs(nextLogs);
      setMessages((prev) =>
        prev.filter((m) => m.id !== userMsg.id && m.id !== assistantMsg?.id)
      );
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus chat');
      await loadDay();
    } finally {
      setBusy(false);
    }
  };

  const paired = useMemo(() => {
    const list: { user?: ChatMessage; assistant?: ChatMessage }[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.sender === 'user') {
        const next = messages[i + 1];
        if (next?.sender === 'assistant') {
          list.push({ user: msg, assistant: next });
          i += 1;
        } else {
          list.push({ user: msg });
        }
      } else {
        list.push({ assistant: msg });
      }
    }
    return list;
  }, [messages]);

  return (
    <AppShell title="Hari ini">
      <DateStrip selected={selected} onSelect={setSelected} loggedDates={loggedDates} />
      <MacroSummary totals={totals} profile={profile} streak={streak} />
      <WaterTracker
        cups={cups}
        goalMl={profile?.water_goal_ml ?? 2000}
        onChange={updateWater}
      />

      <div ref={feedRef} className="flex-1 overflow-y-auto pb-4" style={{ maxHeight: 'calc(100dvh - 390px)' }}>
        {paired.length === 0 && (
          <div className="mx-6 mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-white/60 px-4 py-8 text-center animate-fade-up">
            <p className="display-font text-lg font-semibold">Cerita ke Calo</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Tulis seperti chat biasa — “nasi padang + es teh” atau kirim foto piringmu.
            </p>
          </div>
        )}
        {paired.map((pair, idx) => (
          <div key={pair.user?.id || pair.assistant?.id || idx}>
            {pair.user && (
              <MealCard
                message={pair.user}
                onEditUserMessage={(text) =>
                  handleEditUserMessage(pair.user!, pair.assistant, text)
                }
                onDeleteUserMessage={() =>
                  handleDeleteUserMessage(pair.user!, pair.assistant)
                }
              />
            )}
            {pair.assistant && (
              <MealCard
                message={pair.assistant}
                userText={pair.user?.message_text || undefined}
                logs={logsByMessage.get(pair.assistant.id) || []}
              />
            )}
          </div>
        ))}
      </div>

      <Composer onSend={handleSend} disabled={busy} />
    </AppShell>
  );
}
