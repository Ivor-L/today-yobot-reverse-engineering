// Read-only diagnostic for the reconstructed contact reader. Never emits names,
// values, phone numbers or chat contents, and never posts input events.
import AppKit
import ApplicationServices

func attribute(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
    var result: CFTypeRef?
    guard AXUIElementCopyAttributeValue(element, name as CFString, &result) == .success else { return nil }
    return result
}
func rectangle(_ element: AXUIElement) -> [Double]? {
    guard let p = attribute(element, kAXPositionAttribute), let s = attribute(element, kAXSizeAttribute),
          CFGetTypeID(p) == AXValueGetTypeID(), CFGetTypeID(s) == AXValueGetTypeID() else { return nil }
    var point = CGPoint.zero, size = CGSize.zero
    guard AXValueGetValue(p as! AXValue, .cgPoint, &point), AXValueGetValue(s as! AXValue, .cgSize, &size) else { return nil }
    return [point.x, point.y, size.width, size.height]
}
func shape(_ element: AXUIElement) -> [String: Any] {
    var result: [String: Any] = ["role": attribute(element, kAXRoleAttribute) as? String ?? "unknown"]
    result["rect"] = rectangle(element)
    result["focused"] = attribute(element, kAXFocusedAttribute) as? Bool
    if let title = attribute(element, kAXTitleAttribute) as? String,
       ["昵称", "备注", "标签", "朋友权限", "通讯录管理"].contains(title) { result["anchor"] = title }
    // Structural IDs are whitelisted; arbitrary IDs may contain contact names.
    if let id = attribute(element, kAXIdentifierAttribute) as? String,
       ["contact_list", "chat_input_field", "contact_manager_list"].contains(id) { result["id"] = id }
    return result
}
let trusted = AXIsProcessTrusted()
guard trusted else { print("{\"error\":\"ACCESSIBILITY_PERMISSION_REQUIRED\"}"); exit(2) }
guard let app = NSRunningApplication.runningApplications(withBundleIdentifier: "com.tencent.xinWeChat").first else {
    print("{\"error\":\"WECHAT_NOT_RUNNING\"}"); exit(3)
}
let root = AXUIElementCreateApplication(app.processIdentifier)
let duration = min(60, max(1, Int(CommandLine.arguments.dropFirst().first ?? "1") ?? 1))
let start = Date()
repeat {
    var report: [String: Any] = ["elapsed": Date().timeIntervalSince(start)]
    if let focus = attribute(root, kAXFocusedUIElementAttribute), CFGetTypeID(focus) == AXUIElementGetTypeID() {
        report["focus"] = shape(focus as! AXUIElement)
    }
    if let windows = attribute(root, kAXWindowsAttribute) as? [AXUIElement] {
        report["windows"] = windows.map { window -> [String: Any] in
            var result = shape(window)
            var queue: [(AXUIElement, Int)] = [(window, 0)], index = 0
            var controls: [[String: Any]] = []
            while index < queue.count && index < 500 {
                let (node, depth) = queue[index]; index += 1
                let role = attribute(node, kAXRoleAttribute) as? String ?? ""
                if ["AXTextField", "AXTable", "AXList", "AXScrollArea", "AXStaticText", "AXButton"].contains(role) {
                    var control = shape(node)
                    control["depth"] = depth
                    controls.append(control)
                }
                if depth < 9, let children = attribute(node, kAXChildrenAttribute) as? [AXUIElement] {
                    queue.append(contentsOf: children.map { ($0, depth + 1) })
                }
            }
            result["controls"] = controls
            return result
        }
    }
    if let data = try? JSONSerialization.data(withJSONObject: report, options: [.sortedKeys]),
       let line = String(data: data, encoding: .utf8) { print(line); fflush(stdout) }
    Thread.sleep(forTimeInterval: 0.15)
} while Date().timeIntervalSince(start) < Double(duration)
