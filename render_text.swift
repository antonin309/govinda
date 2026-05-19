import Cocoa
import Foundation
import CoreText

struct TextStyle: Codable {
    var font: String?
    var font_size: Double?
    var color: String?
    var outline_color: String?
    var outline_width: Double?
    var position_y: Double?
    var bg_enabled: Bool?
    var bg_color: String?
    var bg_padding: Double?
    var bg_radius: Double?
}

struct TextConfig: Codable {
    let text: String
    let fontSize: Double?    // legacy
    let output: String
    let width: Int
    let height: Int
    let style: TextStyle?
}

func hexToNSColor(_ hex: String, fallback: NSColor) -> NSColor {
    var h = hex.trimmingCharacters(in: .whitespaces)
    if h.hasPrefix("#") { h = String(h.dropFirst()) }
    guard h.count == 6, let val = UInt64(h, radix: 16) else { return fallback }
    let r = CGFloat((val >> 16) & 0xFF) / 255
    let g = CGFloat((val >> 8)  & 0xFF) / 255
    let b = CGFloat(val & 0xFF) / 255
    return NSColor(srgbRed: r, green: g, blue: b, alpha: 1)
}

let configPath = CommandLine.arguments[1]
let configData = try! Data(contentsOf: URL(fileURLWithPath: configPath))
let config = try! JSONDecoder().decode(TextConfig.self, from: configData)

let style = config.style ?? TextStyle()
let W = config.width
let H = config.height
let fontSize = CGFloat(style.font_size ?? config.fontSize ?? 56)
let fillColor   = hexToNSColor(style.color         ?? "#ffffff", fallback: .white)
let strokeColor = hexToNSColor(style.outline_color ?? "#000000", fallback: .black)
let outlineWidth = CGFloat(style.outline_width ?? 5)
let positionY   = CGFloat(style.position_y ?? 17) / 100.0
let bgEnabled   = style.bg_enabled ?? false
let bgColor     = hexToNSColor(style.bg_color ?? "#ffffff", fallback: .white)
let bgPadding   = CGFloat(style.bg_padding ?? 14)
let bgRadius    = CGFloat(style.bg_radius ?? 10)

// Load font — Anton TTF or system bold fallback
let fontName = style.font ?? "anton"
var ctFont: CTFont
if fontName == "anton" {
    let fontPath = (configPath as NSString).deletingLastPathComponent + "/Anton-Regular.ttf"
    var font: CTFont? = nil
    if let dataProvider = CGDataProvider(filename: fontPath),
       let cgFont = CGFont(dataProvider) {
        CTFontManagerRegisterGraphicsFont(cgFont, nil)
        if let psName = cgFont.postScriptName {
            font = CTFontCreateWithName(psName, fontSize, nil)
        }
    }
    ctFont = font ?? CTFontCreateWithName("HelveticaNeue-Bold" as CFString, fontSize, nil)
} else {
    ctFont = CTFontCreateWithName("HelveticaNeue-Bold" as CFString, fontSize, nil)
}

guard let bitmapRep = NSBitmapImageRep(
    bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H,
    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
    isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
), let ctx = NSGraphicsContext(bitmapImageRep: bitmapRep) else { exit(1) }

NSGraphicsContext.current = ctx

NSColor.clear.setFill()
NSRect(x: 0, y: 0, width: CGFloat(W), height: CGFloat(H)).fill()

let paragraphStyle = NSMutableParagraphStyle()
paragraphStyle.alignment = .center
paragraphStyle.lineSpacing = 10

let nsFont = NSFont(descriptor: (ctFont as AnyObject).fontDescriptor, size: fontSize)
    ?? NSFont.boldSystemFont(ofSize: fontSize)

// Two-pass: stroke first, then fill — no artifacts
let strokeAttrs: [NSAttributedString.Key: Any] = [
    .font: nsFont,
    .foregroundColor: bgEnabled ? fillColor : strokeColor,
    .paragraphStyle: paragraphStyle,
    .strokeWidth: bgEnabled ? 0.0 : outlineWidth * 2,
    .strokeColor: strokeColor,
]
let fillAttrs: [NSAttributedString.Key: Any] = [
    .font: nsFont,
    .foregroundColor: fillColor,
    .paragraphStyle: paragraphStyle,
    .strokeWidth: 0.0,
]

let strokeStr = NSAttributedString(string: config.text, attributes: strokeAttrs)
let fillStr   = NSAttributedString(string: config.text, attributes: fillAttrs)

// Safe zone: 8% padding each side = ~86px on 1080px
let safePad = CGFloat(W) * 0.08
let safeWidth = CGFloat(W) - safePad * 2

let textBounds = fillStr.boundingRect(
    with: CGSize(width: safeWidth, height: 900),
    options: [.usesLineFragmentOrigin, .usesFontLeading]
)

// positionY is fraction from top → convert to Cocoa coords (origin bottom-left)
let topY = CGFloat(H) * positionY
let cocoaYCenter = CGFloat(H) - topY
let textRect = NSRect(
    x: safePad,
    y: cocoaYCenter - textBounds.height / 2,
    width: safeWidth,
    height: textBounds.height + 12
)

// Draw background box if enabled
if bgEnabled {
    let hPad = bgPadding * 1.5
    let vPad = bgPadding
    // Center the box horizontally around the actual text width
    let boxX = safePad - hPad
    let boxY = textRect.origin.y - vPad
    let boxW = safeWidth + hPad * 2
    let boxH = textRect.height + vPad * 2
    let boxRect = CGRect(x: boxX, y: boxY, width: boxW, height: boxH)
    let path = NSBezierPath(roundedRect: boxRect, xRadius: bgRadius, yRadius: bgRadius)
    bgColor.setFill()
    path.fill()
}

if bgEnabled {
    // With background: only fill pass needed (no stroke)
    fillStr.draw(with: textRect, options: [.usesLineFragmentOrigin, .usesFontLeading])
} else {
    // Without background: stroke pass then fill pass
    strokeStr.draw(with: textRect, options: [.usesLineFragmentOrigin, .usesFontLeading])
    fillStr.draw(with: textRect, options: [.usesLineFragmentOrigin, .usesFontLeading])
}

NSGraphicsContext.current = nil

guard let pngData = bitmapRep.representation(using: .png, properties: [:]) else { exit(1) }
try! pngData.write(to: URL(fileURLWithPath: config.output))
