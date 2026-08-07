These email templates are written using MJML (https://mjml.io/resources), a markup language for
responsive emails.

-   Link to the guide: https://documentation.mjml.io/
-   Link to the online editor: https://mjml.io/try-it-live

Create the templates in the online editor, then copy them (not the html output) to this folder and
named with a `.mjml` extension. The API compiles them to html in memory at startup, so there is no
build step and no compiled html to commit.

Each template is registered in `../email.js` along with its subject and plain text alternative.
`{{placeholder}}` markers in the subject, text and mjml are substituted with the `data` passed to
`Mailer.sendMessage()`; anything interpolated into the html is escaped.
