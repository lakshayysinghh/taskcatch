#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod desktop;
mod hotkey;
mod capture;
mod ai_client;
mod config;
mod db;
mod voice;

fn main() {
    desktop::run();
}
