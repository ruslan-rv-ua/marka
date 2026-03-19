use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    Emitter, Manager,
};
use tauri_plugin_dialog::DialogExt;
use std::fs;

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Не вдалося прочитати файл: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![read_file])
        .setup(|app| {
            let open = MenuItemBuilder::new("Відкрити")
                .id("open")
                .accelerator("CmdOrCtrl+O")
                .build(app)?;

            let exit = MenuItemBuilder::new("Вийти")
                .id("exit")
                .build(app)?;

            let file_menu = SubmenuBuilder::new(app, "Файл")
                .item(&open)
                .item(&exit)
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&file_menu)
                .build()?;

            app.set_menu(menu)?;

            app.on_menu_event(move |app_handle, event| {
                match event.id().as_ref() {
                    "exit" => {
                        app_handle.exit(0);
                    }
                    "open" => {
                        let app_handle = app_handle.clone();
                        app_handle
                            .dialog()
                            .file()
                            .add_filter("Markdown", &["md"])
                            .pick_file(move |file_path: Option<tauri_plugin_dialog::FilePath>| {
                                if let Some(fp) = file_path {
                                    if let Some(path) = fp.as_path() {
                                        let _ = app_handle.emit("open-file", path.to_string_lossy().to_string());
                                    }
                                }
                            });
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
