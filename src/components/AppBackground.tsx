import { useLocation } from 'react-router-dom';
import backgroundOverlay from '../assets/ColorBackgroundOverlay.webp';

/** Faint 40px grid that fades out away from the top */
const gridStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px)',
  backgroundSize: '40px 40px',
  maskImage: 'radial-gradient(ellipse 90% 80% at 50% 0%, #000 40%, transparent 100%)',
  WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 50% 0%, #000 40%, transparent 100%)',
};

/** Color glows washing in from the top */
const glowStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'radial-gradient(circle 600px at 50% 80px, rgba(109,62,240,0.35), transparent 70%), radial-gradient(ellipse 700px 420px at 8% 0%, rgba(43,108,255,0.24), transparent 70%), radial-gradient(ellipse 700px 420px at 92% 0%, rgba(56,189,248,0.18), transparent 70%)',
};

const AppBackground = () => {
  const { pathname } = useLocation();
  return (
    <div
      className="app-background"
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
          inset: 0,
          backgroundImage: `url(${backgroundOverlay})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.06,
        }}
      />
      {pathname === '/tools' && (
        <>
          <div style={glowStyle} />
          <div style={gridStyle} />
        </>
      )}
    </div>
  );
};

export default AppBackground;
