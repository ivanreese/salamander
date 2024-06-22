@group(0) @binding(0) var<storage, read_write> state: array<vec4f>;
@group(0) @binding(1) var<uniform> clock: Clock;
@group(0) @binding(2) var<uniform> canvas: Canvas;
@group(0) @binding(3) var<uniform> pointer: Pointer;

struct Clock { frame: f32, dt: f32 };
struct Canvas { w: u32, h: u32 };
struct Pointer { p: vec2f, oldP: vec2f, down: f32 };

fn hash( _x: u32 ) -> u32 {
  var x = _x;
  x += ( x << 10u );
  x ^= ( x >>  6u );
  x += ( x <<  3u );
  x ^= ( x >> 11u );
  x += ( x << 15u );
  return x;
}

fn random( f: f32 ) -> f32 {
  var mantissaMask = 0x007FFFFFu;
  var one          = 0x3F800000u;

  var h = hash( bitcast<u32>( f ) );
  h &= mantissaMask;
  h |= one;

  var r2 = bitcast<f32>( h );
  return r2 - 1.0;
}

fn distToMouse(P: vec2f) -> f32 {
  return pointToLine(P, pointer.p, pointer.oldP);
}

// Given a point P and line AB, return a vec from the point to the line
fn pointToLine(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp( dot(pa, ba) / dot(ba, ba), 0.0, 1.0 );
  return length(pa - ba*h);
}

fn modulo(e1: i32, e2: u32) -> u32 {
  return u32(e1 + i32(e2)) % e2;
}

fn neighbourIndex(x: i32, y: i32) -> u32 {
  return modulo(x, canvas.w) + modulo(y, canvas.h) * canvas.w;
}

fn activeNeighbours(cell: vec3u) -> vec4f {
  let x = i32(cell.x);
  let y = i32(cell.y);
  return
    state[neighbourIndex(x - 1, y + 1)] + // ↖︎
    state[neighbourIndex(x + 0, y + 1)] + // ↑
    state[neighbourIndex(x + 1, y + 1)] + // ↗︎
    state[neighbourIndex(x + 1, y + 0)] + // →
    state[neighbourIndex(x + 1, y - 1)] + // ↘︎
    state[neighbourIndex(x + 0, y - 1)] + // ↓
    state[neighbourIndex(x - 1, y - 1)] + // ↙︎
    state[neighbourIndex(x - 1, y + 0)];  // ←
}

fn stateIndex(x: u32, y: u32) -> u32 {
  return (x % canvas.w) + (y % canvas.h) * canvas.w;
}

@compute
@workgroup_size(8, 8) // Must agree with WORKGROUP_SIZE in app.ts
fn compute(@builtin(global_invocation_id) p: vec3u) {
  let i = f32(p.x + p.y * canvas.w);

  let x = u32(f32(canvas.w) * random(i * clock.frame));
  let y = u32(f32(canvas.h) * random(random(i * clock.frame)));

  let pos = vec3u(x, y, 0u);

  let index = stateIndex(x, y);

  if pointer.down == 1. {
    if distToMouse(vec2f(pos.xy)) < 10. {
      state[index].r = 1.;
    }
  }

  let friends = activeNeighbours(pos);

  // r
  if      friends.r < 2.0 { state[index].r *= 0.99; }
  else if friends.g > 1.0 { state[index].r *= 0.99; }
  else                    { state[index].r += 0.1; }
  state[index].r = clamp(state[index].r, 0., 1.);

  // g
  if      friends.r > 1.7 { state[index].g += 0.01; }
  else                    { state[index].g -= 0.01; }
  state[index].g = clamp(state[index].g, 0., 1.);

  // b
  if      friends.g > 1.0 { state[index].b += 0.01; }
  else                    { state[index].b -= 0.01; }
  state[index].b = clamp(state[index].b, 0., 1.);

}