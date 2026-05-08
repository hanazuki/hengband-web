function(variant)

  local _ = function(ja, en)
    if variant == 'ja' then ja else en;

  {
    '$schema': 'https://json.schemastore.org/web-manifest-combined.json',

    start_url: '/#%s' % [variant],
    id: '/',

    lang: variant,
    name: _('変愚蛮怒ブラウザ版', 'Hengband Web'),
    short_name: _('変愚蛮怒', 'Hengband'),
    description: _('変愚蛮怒をブラウザで遊べます。', 'Play Hengband on your browser.'),

    display: 'standalone',

    background_color: '#282A36',
  }
