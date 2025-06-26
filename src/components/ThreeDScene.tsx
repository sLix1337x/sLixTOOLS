import React, { useEffect, useRef } from 'react';

interface ThreeDSceneProps {
  className?: string;
}

const ThreeDScene: React.FC<ThreeDSceneProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let rotation = 0;

    const render = () => {
      if (!ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update rotation
      rotation += 0.01;
      
      // Set center point
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Size of cube
      const size = Math.min(canvas.width, canvas.height) * 0.4;
      
      // Draw animated cube (simplified 2D version)
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      
      // Draw cube face
      ctx.fillStyle = '#2AD587';
      ctx.fillRect(-size/2, -size/2, size, size);
      
      // Add some shading
      ctx.strokeStyle = '#1a9963';
      ctx.lineWidth = 2;
      ctx.strokeRect(-size/2, -size/2, size, size);
      
      // Add highlight
      ctx.beginPath();
      ctx.moveTo(-size/2, -size/2);
      ctx.lineTo(-size/4, -size/4);
      ctx.lineTo(size/4, -size/4);
      ctx.lineTo(size/2, -size/2);
      ctx.closePath();
      ctx.fillStyle = '#3aeea1';
      ctx.fill();
      
      ctx.restore();
      
      // Request next frame
      animationFrameId = requestAnimationFrame(render);
    };
    
    render();
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={`${className} flex items-center justify-center`}>
      <canvas 
        ref={canvasRef} 
        width={200} 
        height={200} 
        className="w-full h-full"
      />
    </div>
  );
};

export default ThreeDScene;
