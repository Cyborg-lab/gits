export class Vector2D {
  constructor(public x: number, public y: number) {}

  add(v: Vector2D): Vector2D {
    return new Vector2D(this.x + v.x, this.y + v.y);
  }

  sub(v: Vector2D): Vector2D {
    return new Vector2D(this.x - v.x, this.y - v.y);
  }

  mult(n: number): Vector2D {
    return new Vector2D(this.x * n, this.y * n);
  }

  div(n: number): Vector2D {
    return new Vector2D(this.x / n, this.y / n);
  }

  mag(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Vector2D {
    const m = this.mag();
    if (m === 0) return new Vector2D(0, 0);
    return this.div(m);
  }

  limit(max: number): Vector2D {
    if (this.mag() > max) {
      return this.normalize().mult(max);
    }
    return this;
  }

  dist(v: Vector2D): number {
    return Math.sqrt(Math.pow(this.x - v.x, 2) + Math.pow(this.y - v.y, 2));
  }

  copy(): Vector2D {
    return new Vector2D(this.x, this.y);
  }
}