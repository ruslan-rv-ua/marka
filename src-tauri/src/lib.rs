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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_cli::init())
        .invoke_handler(tauri::generate_handler![read_file, open_file_dialog])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
