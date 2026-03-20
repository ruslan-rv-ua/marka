use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use std::fs;

#[derive(serde::Serialize)]
pub struct OpenedFile {
    path: String,
    content: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub font_size: f64,
    pub padding_x: f64,
    pub window_width: f64,
    pub window_height: f64,
    pub window_x: Option<f64>,
    pub window_y: Option<f64>,
    pub window_maximized: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            font_size: 16.0,
            padding_x: 10.0,
            window_width: 800.0,
            window_height: 600.0,
            window_x: None,
            window_y: None,
            window_maximized: false,
        }
    }
}

fn settings_path() -> Option<std::path::PathBuf> {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.join("settings.json")))
}

fn read_settings() -> Settings {
    let Some(path) = settings_path() else {
        return Settings::default();
    };
    let Ok(contents) = fs::read_to_string(&path) else {
        return Settings::default();
    };
    serde_json::from_str(&contents).unwrap_or_default()
}

#[tauri::command]
fn load_settings() -> Settings {
    read_settings()
}

#[tauri::command]
fn save_settings(settings: Settings) -> Result<(), String> {
    let path = settings_path().ok_or("Не вдалося визначити папку exe")?;
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Не вдалося прочитати файл: {}", e))
}

#[tauri::command]
fn open_file_dialog(app: tauri::AppHandle) -> Result<Option<OpenedFile>, String> {
    let file_path = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md"])
        .blocking_pick_file();

    match file_path {
        Some(fp) => {
            let path = fp.to_string();
            let content = fs::read_to_string(fp.as_path().ok_or("Невірний шлях")?)
                .map_err(|e| format!("Не вдалося прочитати файл: {}", e))?;
            Ok(Some(OpenedFile { path, content }))
        }
        None => Ok(None),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let s = read_settings();
            if let Some(window) = app.get_webview_window("main") {
                if s.window_maximized {
                    let _ = window.maximize();
                } else {
                    let _ = window.set_size(tauri::PhysicalSize::new(
                        s.window_width as u32,
                        s.window_height as u32,
                    ));
                    if let (Some(x), Some(y)) = (s.window_x, s.window_y) {
                        let _ = window.set_position(tauri::PhysicalPosition::new(
                            x as i32,
                            y as i32,
                        ));
                    }
                }
            }
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_cli::init())
        .invoke_handler(tauri::generate_handler![read_file, open_file_dialog, load_settings, save_settings])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
