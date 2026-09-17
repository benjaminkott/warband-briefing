import { addons } from 'storybook/manager-api'
import { themes } from 'storybook/theming'

// The app is graphite by default; the frame around the stories follows.
addons.setConfig({ theme: themes.dark })
