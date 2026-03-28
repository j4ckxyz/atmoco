import { useState, useEffect } from 'react';
import './App.css';
import GridLayout from './components/GridLayout';
import { MIN_DESKTOP_WIDTH } from './utils/config';
import { Card, CardContent } from '@/components/ui/card';

function App() {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= MIN_DESKTOP_WIDTH);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= MIN_DESKTOP_WIDTH);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isDesktop) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <h1 className="text-2xl font-bold">Desktop Only</h1>
            <p className="text-muted-foreground">
              This AtmosphereConf multi-stream viewer requires a desktop screen.
            </p>
            <p className="text-sm text-muted-foreground">
              Minimum width: {MIN_DESKTOP_WIDTH}px
            </p>
            <p className="text-sm text-muted-foreground">
              Current width: {window.innerWidth}px
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <GridLayout />;
}

export default App;
