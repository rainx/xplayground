//! Data types for clipboard operations

use napi_derive::napi;
use serde::{Deserialize, Serialize};
use std::fmt;

/// Content type of a clipboard item
#[napi(string_enum)]
#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub enum ClipboardContentType {
    Text,
    RichText,
    Image,
    File,
    Link,
    Color,
    Unknown,
}

impl fmt::Display for ClipboardContentType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ClipboardContentType::Text => write!(f, "text"),
            ClipboardContentType::RichText => write!(f, "rich_text"),
            ClipboardContentType::Image => write!(f, "image"),
            ClipboardContentType::File => write!(f, "file"),
            ClipboardContentType::Link => write!(f, "link"),
            ClipboardContentType::Color => write!(f, "color"),
            ClipboardContentType::Unknown => write!(f, "unknown"),
        }
    }
}

/// Information about the source application
#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceAppInfo {
    pub bundle_id: String,
    pub name: String,
}

/// A clipboard item captured from the system
#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeClipboardItem {
    /// Unique identifier
    pub id: String,
    /// Type of content
    pub content_type: String,
    /// ISO 8601 timestamp
    pub created_at: String,
    /// Source application bundle ID
    pub source_app_bundle_id: Option<String>,
    /// Source application name
    pub source_app_name: Option<String>,

    // Text content
    pub plain_text: Option<String>,
    pub rtf_data: Option<String>,
    pub html_data: Option<String>,

    // Image content
    pub image_data: Option<Vec<u8>>,
    pub image_width: Option<u32>,
    pub image_height: Option<u32>,
    pub image_format: Option<String>,

    // File paths
    pub file_paths: Option<Vec<String>>,

    // Detected content
    pub detected_urls: Option<Vec<String>>,
}

/// Configuration for the clipboard monitor
#[napi(object)]
#[derive(Debug, Clone)]
pub struct ClipboardMonitorConfig {
    /// Polling interval in milliseconds (default: 500)
    pub poll_interval_ms: Option<u32>,
    /// Bundle IDs to exclude from monitoring
    pub excluded_bundle_ids: Option<Vec<String>>,
}

impl Default for ClipboardMonitorConfig {
    fn default() -> Self {
        Self {
            poll_interval_ms: Some(500),
            excluded_bundle_ids: Some(vec![]),
        }
    }
}
