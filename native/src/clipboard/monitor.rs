//! Clipboard monitoring using NSPasteboard

use crate::clipboard::types::{ClipboardContentType, ClipboardMonitorConfig, NativeClipboardItem};
use chrono::Utc;
use std::sync::atomic::{AtomicBool, AtomicI64, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use uuid::Uuid;

#[cfg(target_os = "macos")]
use cocoa::base::{id, nil};
#[cfg(target_os = "macos")]
use cocoa::foundation::{NSArray, NSString};
#[cfg(target_os = "macos")]
use objc::{class, msg_send, sel, sel_impl};

/// Shared state for the clipboard monitor
struct MonitorState {
    running: AtomicBool,
    last_change_count: AtomicI64,
}

/// Read the current clipboard content
#[cfg(target_os = "macos")]
pub fn read_clipboard_content() -> Option<NativeClipboardItem> {
    unsafe {
        let pasteboard: id = msg_send![class!(NSPasteboard), generalPasteboard];
        if pasteboard == nil {
            return None;
        }

        let change_count: i64 = msg_send![pasteboard, changeCount];

        // Get available types
        let types: id = msg_send![pasteboard, types];
        if types == nil {
            return None;
        }

        let mut item = NativeClipboardItem {
            id: Uuid::new_v4().to_string(),
            content_type: ClipboardContentType::Unknown.to_string(),
            created_at: Utc::now().to_rfc3339(),
            source_app_bundle_id: None,
            source_app_name: None,
            plain_text: None,
            rtf_data: None,
            html_data: None,
            image_data: None,
            image_width: None,
            image_height: None,
            image_format: None,
            file_paths: None,
            detected_urls: None,
        };

        // Try to get source app from pasteboard
        item.source_app_bundle_id = get_frontmost_app_bundle_id();
        item.source_app_name = get_frontmost_app_name();

        // Check for file URLs first
        let file_url_type = NSString::alloc(nil).init_str("public.file-url");
        let has_files: bool = msg_send![types, containsObject: file_url_type];

        if has_files {
            if let Some(paths) = read_file_urls(pasteboard) {
                item.file_paths = Some(paths);
                item.content_type = ClipboardContentType::File.to_string();
                return Some(item);
            }
        }

        // Check for images
        let png_type = NSString::alloc(nil).init_str("public.png");
        let tiff_type = NSString::alloc(nil).init_str("public.tiff");
        let has_png: bool = msg_send![types, containsObject: png_type];
        let has_tiff: bool = msg_send![types, containsObject: tiff_type];

        if has_png || has_tiff {
            if let Some((data, format)) = read_image_data(pasteboard) {
                item.image_data = Some(data);
                item.image_format = Some(format);
                item.content_type = ClipboardContentType::Image.to_string();
                // Image dimensions would require additional processing
                return Some(item);
            }
        }

        // Check for HTML
        let html_type = NSString::alloc(nil).init_str("public.html");
        let has_html: bool = msg_send![types, containsObject: html_type];

        if has_html {
            if let Some(html) = read_string_for_type(pasteboard, "public.html") {
                item.html_data = Some(html);
            }
        }

        // Check for RTF
        let rtf_type = NSString::alloc(nil).init_str("public.rtf");
        let has_rtf: bool = msg_send![types, containsObject: rtf_type];

        if has_rtf {
            if let Some(rtf) = read_string_for_type(pasteboard, "public.rtf") {
                item.rtf_data = Some(rtf);
                item.content_type = ClipboardContentType::RichText.to_string();
            }
        }

        // Check for plain text
        let text_type = NSString::alloc(nil).init_str("public.utf8-plain-text");
        let has_text: bool = msg_send![types, containsObject: text_type];

        if has_text {
            if let Some(text) = read_string_for_type(pasteboard, "public.utf8-plain-text") {
                // Detect URLs in text
                let urls = detect_urls(&text);
                if !urls.is_empty() {
                    item.detected_urls = Some(urls.clone());
                    // If the entire text is a single URL, mark as Link type
                    if urls.len() == 1 && text.trim() == urls[0] {
                        item.content_type = ClipboardContentType::Link.to_string();
                    }
                }

                item.plain_text = Some(text);
                if item.content_type == ClipboardContentType::Unknown.to_string() {
                    item.content_type = ClipboardContentType::Text.to_string();
                }
                return Some(item);
            }
        }

        // If we have RTF but no plain text, still return
        if item.rtf_data.is_some() {
            return Some(item);
        }

        None
    }
}

#[cfg(target_os = "macos")]
fn read_string_for_type(pasteboard: id, type_str: &str) -> Option<String> {
    unsafe {
        let ns_type = NSString::alloc(nil).init_str(type_str);
        let data: id = msg_send![pasteboard, stringForType: ns_type];

        if data == nil {
            return None;
        }

        let bytes: *const i8 = msg_send![data, UTF8String];
        if bytes.is_null() {
            return None;
        }

        let c_str = std::ffi::CStr::from_ptr(bytes);
        c_str.to_str().ok().map(|s| s.to_string())
    }
}

#[cfg(target_os = "macos")]
fn read_file_urls(pasteboard: id) -> Option<Vec<String>> {
    unsafe {
        // Create an NSArray containing the NSURL class
        let nsurl_class: id = class!(NSURL) as *const _ as id;
        let classes: id = msg_send![class!(NSArray), arrayWithObject: nsurl_class];

        let urls: id = msg_send![pasteboard, readObjectsForClasses: classes options: nil];

        if urls == nil {
            return None;
        }

        let count: usize = msg_send![urls, count];
        if count == 0 {
            return None;
        }

        let mut paths = Vec::new();
        for i in 0..count {
            let url: id = msg_send![urls, objectAtIndex: i];
            let path: id = msg_send![url, path];
            if path != nil {
                let bytes: *const i8 = msg_send![path, UTF8String];
                if !bytes.is_null() {
                    if let Ok(s) = std::ffi::CStr::from_ptr(bytes).to_str() {
                        paths.push(s.to_string());
                    }
                }
            }
        }

        if paths.is_empty() {
            None
        } else {
            Some(paths)
        }
    }
}

#[cfg(target_os = "macos")]
fn read_image_data(pasteboard: id) -> Option<(Vec<u8>, String)> {
    unsafe {
        // Try PNG first
        let png_type = NSString::alloc(nil).init_str("public.png");
        let png_data: id = msg_send![pasteboard, dataForType: png_type];

        if png_data != nil {
            let length: usize = msg_send![png_data, length];
            let bytes: *const u8 = msg_send![png_data, bytes];
            if !bytes.is_null() && length > 0 {
                let slice = std::slice::from_raw_parts(bytes, length);
                return Some((slice.to_vec(), "png".to_string()));
            }
        }

        // Try TIFF
        let tiff_type = NSString::alloc(nil).init_str("public.tiff");
        let tiff_data: id = msg_send![pasteboard, dataForType: tiff_type];

        if tiff_data != nil {
            let length: usize = msg_send![tiff_data, length];
            let bytes: *const u8 = msg_send![tiff_data, bytes];
            if !bytes.is_null() && length > 0 {
                let slice = std::slice::from_raw_parts(bytes, length);
                return Some((slice.to_vec(), "tiff".to_string()));
            }
        }

        None
    }
}

#[cfg(target_os = "macos")]
fn get_frontmost_app_bundle_id() -> Option<String> {
    unsafe {
        let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
        let app: id = msg_send![workspace, frontmostApplication];

        if app == nil {
            return None;
        }

        let bundle_id: id = msg_send![app, bundleIdentifier];
        if bundle_id == nil {
            return None;
        }

        let bytes: *const i8 = msg_send![bundle_id, UTF8String];
        if bytes.is_null() {
            return None;
        }

        std::ffi::CStr::from_ptr(bytes)
            .to_str()
            .ok()
            .map(|s| s.to_string())
    }
}

#[cfg(target_os = "macos")]
fn get_frontmost_app_name() -> Option<String> {
    unsafe {
        let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
        let app: id = msg_send![workspace, frontmostApplication];

        if app == nil {
            return None;
        }

        let name: id = msg_send![app, localizedName];
        if name == nil {
            return None;
        }

        let bytes: *const i8 = msg_send![name, UTF8String];
        if bytes.is_null() {
            return None;
        }

        std::ffi::CStr::from_ptr(bytes)
            .to_str()
            .ok()
            .map(|s| s.to_string())
    }
}

/// Get the current clipboard change count
#[cfg(target_os = "macos")]
pub fn get_clipboard_change_count() -> i64 {
    unsafe {
        let pasteboard: id = msg_send![class!(NSPasteboard), generalPasteboard];
        if pasteboard == nil {
            return 0;
        }
        msg_send![pasteboard, changeCount]
    }
}

/// Detect URLs in text
fn detect_urls(text: &str) -> Vec<String> {
    let url_pattern = regex::Regex::new(r"https?://[^\s]+").ok();

    match url_pattern {
        Some(re) => re
            .find_iter(text)
            .map(|m| m.as_str().to_string())
            .collect(),
        None => {
            // Fallback: simple check for http:// or https://
            if text.trim().starts_with("http://") || text.trim().starts_with("https://") {
                vec![text.trim().to_string()]
            } else {
                vec![]
            }
        }
    }
}

// Non-macOS fallback implementations
#[cfg(not(target_os = "macos"))]
pub fn read_clipboard_content() -> Option<NativeClipboardItem> {
    None
}

#[cfg(not(target_os = "macos"))]
pub fn get_clipboard_change_count() -> i64 {
    0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_urls() {
        let text = "Check out https://example.com and http://test.org for more";
        let urls = detect_urls(text);
        assert_eq!(urls.len(), 2);
        assert!(urls.contains(&"https://example.com".to_string()));
        assert!(urls.contains(&"http://test.org".to_string()));
    }

    #[test]
    fn test_detect_single_url() {
        let text = "https://github.com/user/repo";
        let urls = detect_urls(text);
        assert_eq!(urls.len(), 1);
        assert_eq!(urls[0], "https://github.com/user/repo");
    }

    #[test]
    fn test_no_urls() {
        let text = "This is plain text without any URLs";
        let urls = detect_urls(text);
        assert!(urls.is_empty());
    }
}
