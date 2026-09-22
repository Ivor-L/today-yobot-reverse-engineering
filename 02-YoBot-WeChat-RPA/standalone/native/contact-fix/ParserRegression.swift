import Foundation
import Darwin
import MachO
struct Parsed { var nickname: String; var remark: String?; var tags: [String]; var requiresPreciseRemark: Bool }
let path = CommandLine.arguments[1]
guard dlopen(path, RTLD_NOW) != nil else { print(String(cString: dlerror())); exit(1) }
var base: UnsafeRawPointer?
for i in 0..<_dyld_image_count() {
    if String(cString: _dyld_get_image_name(i)).hasSuffix("/yobot-parser-test.dylib") { base=UnsafeRawPointer(_dyld_get_image_header(i)) }
}
let parse=unsafeBitCast(base!.advanced(by:0x98710),to:(@convention(thin)(String,String?) throws -> Parsed?).self)
var passed=0
func check(_ raw:String,_ precise:String?,_ name:String,_ remark:String?,_ tags:[String],_ unresolved:Bool=false) throws {
    guard let p=try parse(raw,precise),p.nickname==name,p.remark==remark,p.tags==tags,p.requiresPreciseRemark==unresolved else {
        fatalError("Parser regression failed: synthetic case \(passed+1)")
    }
    passed+=1
}
try check("Example Name  Demo Tag","","Example Name",nil,["Demo Tag"])
try check("测试 用户  活动 标签","","测试 用户",nil,["活动 标签"])
try check("Robot | Custom  Demo Event","","Robot | Custom",nil,["Demo Event"])
try check("Example Name Remark Tag","Remark","Example Name","Remark",["Tag"])
try check("Example  ",nil,"Example",nil,[])
try check("Example Name  ","","Example Name",nil,[])
try check("Example Name  Demo Tag",nil,"Example Name","Demo",["Tag"],true)
// Do not guess which of several double-space boundaries separates columns.
do { _=try parse("First  Last  Demo Tag","");fatalError("Ambiguity accepted") }
catch { passed+=1 }
print("Native parser regression: \(passed) cases passed")
