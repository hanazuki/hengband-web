// SPDX-License-Identifier: MIT OR LicenseRef-Moria-Angband
#include <emscripten.h>

EM_ASYNC_JS(void, web_yield, (), {
    await (scheduler?.yield?.() ?? new Promise(r => setTimeout(r, 0)));
})
