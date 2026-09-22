import Foundation
import ApplicationServices

// Layout follows the recovered Swift value type; kept internal to the shim.
struct ParsedContactTitle {
    var nickname: String
    var remark: String?
    var tags: [String]
    var requiresPreciseRemark: Bool
}
private var originalAddress: UnsafeRawPointer!
private typealias Parser = @convention(thin) (String, String?) throws -> ParsedContactTitle?

@_cdecl("yobot_install_contact_fix")
public func installContactFix(_ base: UnsafeMutableRawPointer, _ implementation: UnsafeRawPointer, _ readRemark: UnsafeRawPointer) {
    originalAddress = UnsafeRawPointer(base.advanced(by: 0x237010))
    base.advanced(by: 0x257ff0).storeBytes(of: implementation, as: UnsafeRawPointer.self)
    base.advanced(by: 0x257ff8).storeBytes(of: readRemark, as: UnsafeRawPointer.self)
}

// Called only after the original reader has verified role, focus and geometry.
// Both original string helpers discard empty values, including rawStringValue.
@_silgen_name("yobot_read_remark")
func readRemark(_ element: AXUIElement, _ attribute: String) -> String? {
    guard attribute == kAXValueAttribute as String else { return nil }
    var value: CFTypeRef?
    guard AXUIElementCopyAttributeValue(element, attribute as CFString, &value) == .success else { return nil }
    return value as? String
}

@_silgen_name("yobot_parse_contact")
func parseContactTitle(_ raw: String, _ preciseRemark: String?) throws -> ParsedContactTitle? {
    let original = unsafeBitCast(originalAddress!, to: Parser.self)
    guard let result = try original(raw, preciseRemark), result.requiresPreciseRemark,
          let preciseRemark, preciseRemark.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
        return try original(raw, preciseRemark)
    }
    // A verified empty editor is distinct from an absent editor. In the AX
    // combined title, the empty remark occupies the gap between two spaces.
    let parts = raw.components(separatedBy: "  ")
    guard parts.count == 2 else {
        throw NSError(domain: "YoBotContactFix", code: 1, userInfo: [NSLocalizedDescriptionKey: "Verified empty remark has ambiguous column separators"])
    }
    let name = parts[0].trimmingCharacters(in: .whitespacesAndNewlines)
    let tags = parts[1].trimmingCharacters(in: .whitespacesAndNewlines)
    // Delegate bounds, tag parsing and placeholder handling to the original
    // parser, and verify that its projection kept the entire nickname.
    guard let resolved = try original(name + " 添加备注 " + tags, "添加备注"),
          resolved.nickname == name, resolved.remark == nil, !resolved.requiresPreciseRemark else {
        throw NSError(domain: "YoBotContactFix", code: 2, userInfo: [NSLocalizedDescriptionKey: "Empty-remark projection could not be verified"])
    }
    return resolved
}
