# Orders process requests

The pure factory builds Platform `ProcessRequest` values from the real actor,
order status, workflow and configured approval groups. It never executes a
process, reads configuration, persists data or sends notifications.
