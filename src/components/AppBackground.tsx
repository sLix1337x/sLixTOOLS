import React, { memo } from 'react';
import backgroundOverlay from '../assets/ColorBackgroundOverlay.webp';

interface AppBackgroundProps {
    className?: string;
}

const AppBackground: React.FC<AppBackgroundProps> = memo(({ className = '' }) => {
    return (
        <div
            className={`app-background ${className}`}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 0,
                pointerEvents: 'none',
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundImage: `url(${backgroundOverlay})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    opacity: 0.06,
                    mixBlendMode: 'screen',
                }}
            />
        </div>
    );
});

AppBackground.displayName = 'AppBackground';

export default AppBackground;
