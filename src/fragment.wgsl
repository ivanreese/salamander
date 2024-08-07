@group(0) @binding(0) var sam: sampler;
@group(0) @binding(1) var tex: texture_2d<f32>;
@group(0) @binding(2) var<storage, read_write> state: array<vec4f>;
@group(0) @binding(3) var<uniform> clock: Clock;
@group(0) @binding(4) var<uniform> canvas: Canvas;
@group(0) @binding(5) var<uniform> pointer: Pointer;

struct Clock { frame: f32, dt: f32 };
struct Canvas { w: u32, h: u32 };
struct Pointer { p: vec2f, oldP: vec2f, down: f32 };

fn curve(x: f32) -> f32 {
  return x * (x * (x * (x * 0.25 - 0.75) + 1.5) - 0.5);
}

fn saturate(color: vec3f, saturation: f32) -> vec3f {
  let luminance: f32 = dot(color, vec3f(0.2, 0.7, 0.1));
  return mix(vec3f(luminance), color, saturation);
}

// @location(0) means it'll render to the first render target, which corresponds to the targets array passed to createRenderPipeline
@fragment
fn fragment(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let p = vec2u(pos.xy);
  let pNorm = pos.xy / (20f * 20f);
  let index = p.x + p.y * canvas.w;

  // tone mapping
  var color = vec3f(state[index].brg);
  color.r = curve(color.r);
  color.g = curve(color.g);
  color.b = curve(color.b);
  color = saturate(color, 5.);
  color = pow(color, vec3f(0.4));

  // return textureSample(tex, sam, pNorm);

  return vec4f(color, 1.);
}
