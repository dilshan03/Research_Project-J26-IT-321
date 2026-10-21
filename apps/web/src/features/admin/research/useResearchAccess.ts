import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { accessFromResponse, shouldCheckResearchAccess, type ResearchAccess } from './access';
import { researchApi } from './researchApi';

/** Asks the server whether this account may open research analytics (the server decides; no data is returned). */
export const useResearchAccess = (): ResearchAccess => {
  const { user } = useAuth();
  const check = shouldCheckResearchAccess(user?.role);
  const account = user?.id ?? '';
  const [result, setResult] = useState<{ account: string; access: ResearchAccess } | null>(null);

  useEffect(() => {
    if (!check) return;
    let alive = true;
    researchApi.access().then((res) => alive && setResult({ account, access: accessFromResponse(res) }));
    return () => {
      alive = false;
    };
  }, [check, account]);

  if (!check) return 'denied';
  return result && result.account === account ? result.access : 'loading';
};
