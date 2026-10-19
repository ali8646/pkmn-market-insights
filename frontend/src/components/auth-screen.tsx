import { FormEvent, useState } from 'react';
import { authClient } from '../lib/auth';

type AuthMode = 'signIn' | 'signUp';

export default function AuthScreen({ onClose }: { onClose?: () => void }) {
    const client = authClient;
    const [mode, setMode] = useState<AuthMode>('signIn');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!client) {
        return (
            <main className="auth-shell">
                <section className="auth-card">
                    <div className="brand-name">CardSight</div>
                    <h1>Authentication unavailable</h1>
                    <p className="auth-description">
                        Configure VITE_NEON_AUTH_URL to enable sign-in for this environment.
                    </p>
                    {onClose && <button type="button" className="auth-mode-toggle" onClick={onClose}>Close</button>}
                </section>
            </main>
        );
    }

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const result = mode === 'signIn'
                ? await client.signIn.email({ email, password })
                : await client.signUp.email({ email, password, name });
            if (result.error) {
                setError(result.error.message || 'Authentication failed');
            }
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Authentication failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const signInWithSocialProvider = async (provider: 'google' | 'github') => {
        setError(null);
        try {
            const result = await client.signIn.social({
                provider,
                callbackURL: window.location.origin,
            });
            if (result.error) setError(result.error.message || 'Social sign-in failed');
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Social sign-in failed');
        }
    };

    return (
        <main className="auth-shell">
            <section className="auth-card">
                {onClose && <button type="button" className="auth-close" onClick={onClose} aria-label="Close sign-in">✕</button>}
                <div className="brand-name">CardSight</div>
                <p className="brand-subtitle">Pokémon market insights</p>
                <h1>{mode === 'signIn' ? 'Welcome back' : 'Create your account'}</h1>
                <p className="auth-description">
                    Sign in to explore the live market catalog and save your watchlist.
                </p>

                <div className="social-auth-actions">
                    <button type="button" onClick={() => void signInWithSocialProvider('google')}>
                        Continue with Google
                    </button>
                    <button type="button" onClick={() => void signInWithSocialProvider('github')}>
                        Continue with GitHub
                    </button>
                </div>
                <div className="auth-divider"><span>or use email</span></div>

                <form onSubmit={(event) => void submit(event)} className="auth-form">
                    {mode === 'signUp' && (
                        <label>
                            Name
                            <input value={name} onChange={(event) => setName(event.target.value)} required />
                        </label>
                    )}
                    <label>
                        Email
                        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                    </label>
                    <label>
                        Password
                        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
                    </label>
                    {error && <p className="auth-error" role="alert">{error}</p>}
                    <button type="submit" className="auth-submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Please wait...' : mode === 'signIn' ? 'Sign in' : 'Create account'}
                    </button>
                </form>

                <button
                    type="button"
                    className="auth-mode-toggle"
                    onClick={() => {
                        setMode(mode === 'signIn' ? 'signUp' : 'signIn');
                        setError(null);
                    }}
                >
                    {mode === 'signIn' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
                </button>
            </section>
        </main>
    );
}
