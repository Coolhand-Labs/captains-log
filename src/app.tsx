import type { JSX } from 'preact';
import { route } from './router';
import { startrekTheme } from './theme/startrek';
import { Landing } from './screens/Landing';
import { Configure } from './screens/Configure';
import { Review } from './screens/Review';
import { Reward } from './screens/Reward';
import { ToastHost } from './components/Toast';

export function App(): JSX.Element {
  const theme = startrekTheme;
  const screen = (() => {
    switch (route.value) {
      case 'configure':
        return <Configure theme={theme} />;
      case 'review':
        return <Review theme={theme} />;
      case 'reward':
        return <Reward theme={theme} />;
      default:
        return <Landing theme={theme} />;
    }
  })();

  return (
    <>
      {/* key forces remount so the fade transition plays on every route change */}
      <div class="cl-route cl-fade-in" key={route.value}>
        {screen}
      </div>
      <ToastHost />
    </>
  );
}
