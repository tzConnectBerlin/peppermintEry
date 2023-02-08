import { v4 as uuidv4 } from 'uuid';

export default function({ db, originator, pollingDelay }) {
  let process_uuid = uuidv4();
  console.log("Process UUID:", process_uuid);

  const register = async function() {
      let [ _ ] = await Promise.all([
        db.register_process({ originator, process_uuid }),
        new Promise(_ => setTimeout(_, pollingDelay))
      ]);
  };

  const unregister = function() {
    return db.unregister_process({ originator, process_uuid });
  };

  const get_process_uuid = function() {
    return process_uuid;
  }

  return {
    register,
    unregister,
    get_process_uuid
  };
}