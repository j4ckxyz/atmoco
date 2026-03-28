import { useState, useEffect } from 'react';
import './App.css';
import GridLayout from './components/GridLayout';
import MobileLayout from './components/MobileLayout';

function detectMobileLikeView() {
  const isNarrow = window.innerWidth < 1024;
  const isShort = window.innerHeight < 700;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUA = /iphone|ipad|ipod|android|mobile|silk/.test(userAgent);

  return isNarrow || isShort || coarsePointer || isMobileUA;
}

function App() {
  const [isMobileLike, setIsMobileLike] = useState(detectMobileLikeView());

  useEffect(() => {
    const handleResize = () => {
      setIsMobileLike(detectMobileLikeView());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  if (isMobileLike) {
    return <MobileLayout />;
  }

  return <GridLayout />;
}

export default App;
