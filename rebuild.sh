docker build -t trading-monitor . && docker run --rm --net=trading-agent_default -p 3000:3000 trading-monitor
