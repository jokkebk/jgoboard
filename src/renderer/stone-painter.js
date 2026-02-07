import { MARK, STONE } from '../core/constants.js';

export class StonePainter {
  constructor(theme) {
    this.setTheme(theme);
  }

  setTheme(theme) {
    this.theme = theme;
    this.stoneRadius = theme.stone.radius;
    this.gridX = theme.grid.x;
    this.gridY = theme.grid.y;
    this.markX = this.stoneRadius * 1.1;
    this.markY = this.stoneRadius * 1.1;
    this.circleR = this.stoneRadius * 0.5;
    this.triangleR = this.stoneRadius * 0.9;
  }

  drawStone(ctx, stone, x, y, assets, scale = 1) {
    const texture =
      stone === STONE.BLACK || stone === STONE.DIM_BLACK ? assets.black : assets.white;

    if (!texture) {
      ctx.fillStyle = stone === STONE.WHITE || stone === STONE.DIM_WHITE ? '#ffffff' : '#000000';
      ctx.beginPath();
      ctx.arc(x, y, this.stoneRadius * scale, 0, Math.PI * 2, false);
      ctx.fill();

      if (stone === STONE.WHITE || stone === STONE.DIM_WHITE) {
        ctx.strokeStyle = '#000000';
        ctx.stroke();
      }
      return;
    }

    const width = texture.width * scale;
    const height = texture.height * scale;

    ctx.drawImage(texture, Math.round(x - width / 2), Math.round(y - height / 2), width, height);
  }

  drawShadow(ctx, x, y, assets, scale = 1) {
    if (!assets.shadow) {
      return;
    }

    const width = assets.shadow.width * scale;
    const height = assets.shadow.height * scale;

    ctx.drawImage(assets.shadow, Math.round(x - width / 2), Math.round(y - height / 2), width, height);
  }

  drawMark(ctx, mark, x, y, color, assets) {
    if (!mark) {
      return;
    }

    ctx.lineWidth = this.theme.mark.lineWidth;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.font = this.theme.mark.font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    switch (mark) {
      case MARK.SQUARE:
        ctx.beginPath();
        ctx.rect(x - this.markX / 2, y - this.markY / 2, this.markX, this.markY);
        ctx.stroke();
        break;
      case MARK.CROSS:
        ctx.beginPath();
        ctx.moveTo(x - this.markX / 2, y + this.markY / 2);
        ctx.lineTo(x + this.markX / 2, y - this.markY / 2);
        ctx.moveTo(x - this.markX / 2, y - this.markY / 2);
        ctx.lineTo(x + this.markX / 2, y + this.markY / 2);
        ctx.stroke();
        break;
      case MARK.TRIANGLE:
        ctx.beginPath();
        for (let i = 0; i < 3; i += 1) {
          ctx.moveTo(
            x + this.triangleR * Math.cos(Math.PI * (0.5 + (2 * i) / 3)),
            y - this.triangleR * Math.sin(Math.PI * (0.5 + (2 * i) / 3))
          );
          ctx.lineTo(
            x + this.triangleR * Math.cos(Math.PI * (0.5 + (2 * (i + 1)) / 3)),
            y - this.triangleR * Math.sin(Math.PI * (0.5 + (2 * (i + 1)) / 3))
          );
        }
        ctx.stroke();
        break;
      case MARK.CIRCLE:
        ctx.beginPath();
        ctx.arc(x, y, this.circleR, 0, Math.PI * 2, false);
        ctx.stroke();
        break;
      case MARK.BLACK_TERRITORY:
        this.drawStone(ctx, STONE.BLACK, x, y, assets, 0.5);
        break;
      case MARK.WHITE_TERRITORY:
        this.drawStone(ctx, STONE.WHITE, x, y, assets, 0.5);
        break;
      case MARK.SELECTED:
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#8080ff';
        ctx.fillRect(x - this.gridX / 2, y - this.gridY / 2, this.gridX, this.gridY);
        ctx.globalAlpha = 1;
        break;
      default:
        ctx.fillText(mark, x, y);
        break;
    }
  }
}
