#![deny(clippy::all)]

use napi_derive::napi;

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
