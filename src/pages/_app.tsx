import type { AppProps } from 'next/app';
import { FirebaseProvider } from '../contexts/FirebaseContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <FirebaseProvider>
      <Component {...pageProps} />
    </FirebaseProvider>
  );
}

export default MyApp;