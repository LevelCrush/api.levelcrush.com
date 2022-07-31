import Database from './orm/database';
import ENV from './env';
import Server from './server/server';
import ServerController from './server/server_controller';
import UserController from './controller/user_controller';
import ApplicationController from './controller/application_controller';
import CreatorController from './controller/creator_controller';
import FeedController from './controller/feed_controller';

async function main(): Promise<void> {
    console.log('Starting database');
    let database = new Database();
    await database.connect();

    console.log('Starting Server');
    let server = new Server(database);

    console.log('Loading Routes + Controllers');
    let controllers: ServerController[] = [
        new UserController(),
        new ApplicationController(),
        new CreatorController(),
        new FeedController(),
    ];
    controllers.forEach((controller, index) => {
        server.router(controller.route, controller.router);
    });

    let awaitingPromises: Promise<unknown>[] = [];

    // start the server
    console.log('Starting server');
    awaitingPromises.push(server.start());

    console.log('Starting database auto ping');
    awaitingPromises.push(database.startAutoPing());

    await Promise.all(awaitingPromises);

    console.log('Closing');
    await database.close();
}

main().then(() => {
    console.log('Done.');
});
