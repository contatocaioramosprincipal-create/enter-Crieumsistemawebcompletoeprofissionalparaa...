import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '@/lib/format';

// Mutações dos painéis do processo: só informa sucesso quando o banco confirmou a alteração.
export function useCaseMutate() {
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const mutate = async (operation: () => PromiseLike<{ data?: unknown[] | null; error: unknown }>, message: string) => {
    setBusy(true);
    try {
      const result = await operation();
      if (result.error) throw result.error;
      if (Array.isArray(result.data) && result.data.length === 0) throw new Error('Nenhum registro foi alterado. Verifique sua permissão sobre este processo.');
      await cache.invalidateQueries();
      toast.success(message);
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, mutate, cache };
}
export async function runRpc<T>(operation: () => Promise<T>, message: string) {
  try {
    const result = await operation();
    toast.success(message);
    return result;
  } catch (error) {
    toast.error(errorMessage(error));
    return null;
  }
}
