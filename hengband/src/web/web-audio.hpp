#pragma once

extern "C" void web_play_sound_js(const char *name);
extern "C" void web_play_music_js(int type, int val);
extern "C" void web_play_music_scene_js(const int *types, const int *vals, int n);
