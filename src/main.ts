import './styles.css';

const canvas = document.getElementById('game') as HTMLCanvasElement | null;
if (canvas) {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f0';
    ctx.font = '16px monospace';
    ctx.fillText('Hello, ft_transcendence!', 20, 30);
  }
}
