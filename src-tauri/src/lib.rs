use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
                        // Will be implemented in Task 3
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
