#![deny(clippy::all)]

use napi_derive::napi;

// Clipboard monitoring module
pub mod clipboard;

// Re-export clipboard types for napi
pub use clipboard::monitor::{get_clipboard_change_count, read_clipboard_content};
pub use clipboard::types::*;

/// Read the current clipboard and return as a native item
#[napi]
pub fn clipboard_read() -> Option<NativeClipboardItem> {
    read_clipboard_content()
}

/// Get the current clipboard change count (for polling)
#[napi]
pub fn clipboard_change_count() -> i64 {
    get_clipboard_change_count()
}

/// Example native function - returns a greeting
#[napi]
pub fn greet(name: String) -> String {
    format!("Hello, {}! This message comes from Rust.", name)
}

/// Example: Get system info (can be extended for macOS-specific features)
#[napi]
pub fn get_platform_info() -> String {
    format!(
        "Platform: {}, Arch: {}",
        std::env::consts::OS,
        std::env::consts::ARCH
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_greet() {
        let result = greet("World".to_string());
        assert_eq!(result, "Hello, World! This message comes from Rust.");
    }

    #[test]
    fn test_platform_info() {
        let info = get_platform_info();
        assert!(info.contains("Platform:"));
        assert!(info.contains("Arch:"));
    }
}
