#! /bin/sh
NODE_ENV=production
DAEMON="node /root/vshow/cluster.js"
NAME=vshow
DESC=vshow
PIDFILE="/root/vshow/vshow.pid"
case "$1" in
start)
echo "Starting $DESC: "
nohup $DAEMON > /dev/null &
echo $! > $PIDFILE
echo "$NAME."
;;
stop)
echo "Stopping $DESC: "
pid='cat $PIDFILE'
kill $pid
rm $PIDFILE
echo "$NAME."
;;
esac
exit 0