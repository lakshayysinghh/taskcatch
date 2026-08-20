#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod desktop;
mod hotkey;
mod capture;
mod ai_client;
mod config;
mod db;

fn main() {
    desktop::run();
}
