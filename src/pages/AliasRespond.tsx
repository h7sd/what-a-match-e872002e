import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function AliasRespond() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const action = searchParams.get('action');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [responseType, setResponseType] = useState<'approved' | 'denied' | null>(null);

  useEffect(() => {
    const handleResponse = async () => {
      if (!token || !action) {
        setStatus('error');
        setMessage('Invalid link. Missing token or action.');
        return;
      }

      if (action !== 'approve' && action !== 'deny') {
        setStatus('error');
        setMessage('Invalid action.');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('alias-request', {
          body: {
            action: 'respond',
            token,
            response: action === 'approve' ? 'approved' : 'denied',
          },
        });

        if (error) throw error;

        if (data?.success) {
          setStatus('success');
          setResponseType(action === 'approve' ? 'approved' : 'denied');
          setMessage(
            action === 'approve'
              ? 'Alias request approved! The user can now use this handle.'
              : 'Alias request denied.'
          );
        } else {
          throw new Error(data?.error || 'Failed to process response');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Failed to process response');
      }
    };

    handleResponse();
  }, [token, action]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin mb-4" />
              <h1 className="text-xl font-semibold">Processing...</h1>
              <p className="text-muted-foreground mt-2">Please wait while we process your response.</p>
            </>
          )}

          {status === 'success' && (
            <>
              {responseType === 'approved' ? (
                <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
              ) : (
                <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              )}
              <h1 className="text-xl font-semibold">
                {responseType === 'approved' ? 'Request Approved' : 'Request Denied'}
              </h1>
              <p className="text-muted-foreground mt-2">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <h1 className="text-xl font-semibold">Error</h1>
              <p className="text-muted-foreground mt-2">{message}</p>
            </>
          )}

          <Link
            to="/"
            className="inline-flex items-center gap-2 mt-6 text-primary hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
