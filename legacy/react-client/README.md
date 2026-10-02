# Archived React frontend

This is the original React/Vite implementation, preserved with the local changes
present before the Java HTML migration. It is reference material and is not part
of the active application or Maven build.

The active UI is served by Spring Boot from `server/src/main/resources/templates`
and `server/src/main/resources/static`. Its stylesheets and SVG paths were copied
from this frontend to preserve the appearance.

Start the complete application with `cd server && ./mvnw spring-boot:run` and open
http://localhost:4000. React, Vite and npm are not required.
