import {
    // create naive ui
    create,
    // component
    NText,
    NP,
    NMessageProvider,
    NDialogProvider
  } from 'naive-ui'
  
  const naive = create({
    components: [NP, NText, NMessageProvider, NDialogProvider]
  })

  export default naive