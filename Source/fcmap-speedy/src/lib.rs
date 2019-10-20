mod utils;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern {
    fn alert(s: &str);
	
    #[wasm_bindgen(js_namespace = console)]
	fn log(s: &str);
}

macro_rules! log_f {
    // uses the extern 'log' function
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}


#[wasm_bindgen]
pub fn init() {
	utils::set_panic_hook();

	log("[fcmap-speedy] Library initialized");
}
