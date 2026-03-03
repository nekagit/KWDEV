//! Tauri process entry: delegates to run_prompts crate.
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    run_prompts::run()
}
