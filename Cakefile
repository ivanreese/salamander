require "sweetbread"

child_process = require "child_process"
fs = require "fs"
glob = require "glob"
swc = require "@swc/core"
typescript = require "typescript"

exists = (filePath)-> fs.existsSync filePath
mkdir = (filePath)-> fs.mkdirSync filePath, recursive: true
rm = (filePath)-> if exists filePath then fs.rmSync filePath, recursive: true
read = (filePath)-> if exists filePath then fs.readFileSync(filePath).toString()
write = (filePath, text)-> fs.writeFileSync filePath, text
copy = (filePath, dest)-> fs.copyFileSync filePath, dest

compileTypescript = (src, dest)->
  rm "public/script"

  for filePath in glob.sync "src/**/*.wgsl"
    copy filePath, filePath.replace("src", "public")

  for filePath in glob.sync "src/**/*.ts"
    result = swc.transformSync read(filePath),
      filename: filePath
      jsc: target: "esnext"
    fileDest = filePath.replace("src", "public/script").replace(".ts", ".js")
    mkdir fileDest.split("/")[0...-1].join("/")
    write fileDest, result.code

task "build", "Compile everything", ()->
  start = performance.now()
  compileTypescript()
  log "Build " + duration start

task "watch", "Recompile on changes.", ()->
  watch "src", "build", reload

task "serve", "Spin up a live reloading server.", ()->
  serve "public"

task "start", "Go!", ()->
  doInvoke "build"
  doInvoke "watch"
  doInvoke "serve"
