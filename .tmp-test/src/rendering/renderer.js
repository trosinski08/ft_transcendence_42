"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drawMain = drawMain;
exports.drawFour = drawFour;
const translations_1 = require("../i18n/translations");
const constants_1 = require("../game/constants");
function drawMain(ctx, state) {
    if (!ctx)
        return;
    const { W, H, p1Y, p2Y, p1H, p2H, paddleW, ball, pickup, puMsg, winner, running, firstStartShown, currentLang, particles, ballTrail } = state;
    // clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    // paddles
    ctx.fillStyle = '#0f0';
    ctx.fillRect(constants_1.ARENA.LEFT_X, p1Y, paddleW, p1H);
    ctx.fillRect(W - constants_1.ARENA.RIGHT_X_OFFSET - paddleW, p2Y, paddleW, p2H);
    // ball
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    // pickup
    if (pickup) {
        ctx.beginPath();
        const col = pickup.type === 'FAST' ? '#ffd166' : pickup.type === 'SLOW' ? '#118ab2' : pickup.type === 'BIG' ? '#06d6a0' : pickup.type === 'SMALL' ? '#ef476f' : '#a78bfa';
        ctx.fillStyle = col;
        ctx.arc(pickup.x, pickup.y, pickup.r, 0, Math.PI * 2);
        ctx.fill();
    }
    // center line
    ctx.strokeStyle = 'rgba(0,255,106,0.35)';
    ctx.setLineDash([10, 14]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);
    // overlays
    if (winner) {
        ctx.fillStyle = '#00ff6a';
        ctx.font = '24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText((0, translations_1.t)(currentLang, 'game.overlay.win', { name: winner || 'Player' }), W / 2, H / 2);
    }
    else if (!running && firstStartShown) {
        ctx.fillStyle = '#0f0';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText((0, translations_1.t)(currentLang, 'game.overlay.start'), W / 2, H / 2);
    }
    if (puMsg && performance.now() < puMsg.until) {
        ctx.fillStyle = '#9fdc9f';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(puMsg.text, W / 2, 28);
    }
    // draw trails and particles
    // ball trail
    if (ballTrail) {
        ballTrail.forEach((tObj) => {
            const alpha = tObj.life / 15;
            ctx.save();
            ctx.globalAlpha = alpha * 0.6;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(tObj.x, tObj.y, 2 * alpha, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }
    if (particles) {
        particles.forEach((p) => {
            const alpha = p.life / p.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            if (p.type === 'explosion') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
                ctx.fill();
            }
            else {
                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            }
            ctx.restore();
        });
    }
}
function drawFour(ctx, state) {
    if (!ctx)
        return;
    const { p4W, p4H, p4Players, p4Ball, p4Winner, currentLang } = state;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, p4W, p4H);
    ctx.strokeStyle = 'rgba(0,255,106,0.6)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, p4W - 4, p4H - 4);
    p4Players.forEach((p) => { ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.w, p.h); });
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.arc(p4Ball.x, p4Ball.y, p4Ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9fdc9f';
    ctx.font = '12px monospace';
    ctx.fillText(`${p4Players[0].alias}: ${p4Players[0].score}`, 10, 12);
    ctx.fillText(`${p4Players[1].alias}: ${p4Players[1].score}`, p4W - 150, 12);
    ctx.fillText(`${p4Players[2].alias}: ${p4Players[2].score}`, 10, p4H - 8);
    ctx.fillText(`${p4Players[3].alias}: ${p4Players[3].score}`, p4W - 150, p4H - 8);
    ctx.textAlign = 'center';
    if (p4Winner) {
        ctx.fillStyle = '#00ff6a';
        ctx.font = '20px monospace';
        ctx.fillText((0, translations_1.t)(currentLang, 'multi.win', { name: p4Winner }), p4W / 2, p4H / 2);
        ctx.font = '12px monospace';
        ctx.fillStyle = '#9fdc9f';
        ctx.fillText((0, translations_1.t)(currentLang, 'multi.resetHint'), p4W / 2, p4H / 2 + 24);
    }
    else {
        ctx.fillStyle = '#9fdc9f';
        ctx.font = '14px monospace';
        ctx.fillText((0, translations_1.t)(currentLang, 'multi.start'), p4W / 2, p4H / 2);
    }
}
//# sourceMappingURL=renderer.js.map