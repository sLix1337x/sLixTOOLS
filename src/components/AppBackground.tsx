import backgroundOverlay from '../assets/ColorBackgroundOverlay.webp';

const AppBackground = () => (
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
        mixBlendMode: 'screen',
      }}
    />
  </div>
);

export default AppBackground;
