"""Proposal-only Monte Carlo model; never imports or modifies game state. Requires NumPy."""
import numpy as np,json
N=8000
H=15
COST=np.array([0,20,40,60,80,10**9],dtype=np.int32)

def simulate(label,free28=48,paid30=0,p=.1,sessions_week=4,farm=True,days=365,seed=20261108,initial_owned=1,initial_stars=1,startup_tickets=True,exchange_cost=30,shard_min=1,shard_max=5,bootstrap_factor=1):
    if not (0<=p<=1 and free28>=0 and paid30>=0 and exchange_cost>=1 and days>=1):
        raise ValueError("invalid rate, income, exchange cost or horizon")
    if not (1<=initial_owned<=H and 1<=initial_stars<=5 and 1<=shard_min<=shard_max and bootstrap_factor>=0):
        raise ValueError("invalid starting inventory, shard bounds or bootstrap")
    rng=np.random.default_rng(seed)
    stars=np.zeros((N,H),np.int8); stars[:,:initial_owned]=initial_stars
    shards=np.zeros((N,H),np.int32); universal=np.zeros(N,np.int32); marks=np.zeros(N,np.int32)
    first5=np.zeros(N,np.int16); completion=np.zeros(N,np.int16);maxcompletion=np.zeros(N,np.int16)
    idx=np.arange(N); session_count=0
    if sessions_week==3: schedule={0,2,4}
    elif sessions_week==4:schedule={0,2,4,6}
    elif sessions_week==7:schedule=set(range(7))
    else:raise ValueError("sessions_week must be 3, 4 or 7")
    farm_count=0
    rate=free28/28+paid30/30
    total=0; snapshots={}
    def focus():
        ok=(stars>0)&(stars<5)
        return ok.argmax(axis=1),ok.any(axis=1)
    def award_full(target,mask):
        rows=idx[mask];t=target[mask];s=stars[rows,t]
        new=s==0; stars[rows[new],t[new]]=1
        dup=~new;rr=rows[dup];tt=t[dup];full=stars[rr,tt]>=5
        universal[rr[full]]+=20;shards[rr[~full],tt[~full]]+=20
    def settle():
        unlock=(stars==0)&(shards>=100); stars[unlock]=1; shards[unlock]-=100
        for h in range(H):
            for _ in range(4):
                s=stars[:,h];cost=COST[s];ok=(s>0)&(s<5)&(shards[:,h]+universal>=cost)
                rows=idx[ok];own=np.minimum(shards[ok,h],cost[ok]);shards[ok,h]-=own;universal[ok]-=cost[ok]-own;stars[ok,h]+=1
            done=stars[:,h]==5;universal[done]+=shards[done,h];shards[done,h]=0
    for day in range(1,days+1):
        dow=(day-1)%7
        if dow==0:farm_count=0
        if dow in schedule:
            session_count+=1
            if farm and farm_count<4:
                t,valid=focus();rows=idx[valid];shards[rows,t[valid]]+=20;farm_count+=1
        # Once-only intro/first-clear tickets. Revised nominal scheme doubles them; not recurring.
        once=(8 if day==1 else (3 if day in [7,14,21,28] else 0)) if startup_tickets else 0
        pulls=int(np.floor(day*rate)-np.floor((day-1)*rate))+once*bootstrap_factor
        total+=pulls
        for _ in range(pulls):
            target=rng.integers(0,H,N);full=rng.random(N)<p
            award_full(target,full)
            rows=idx[~full];t=target[~full];amt=rng.integers(shard_min,shard_max+1,len(rows));done=stars[rows,t]>=5
            universal[rows[done]]+=amt[done];shards[rows[~done],t[~done]]+=amt[~done]
            marks+=1
            selectable=marks>=exchange_cost
            if selectable.any():
                unowned=stars==0;has_new=unowned.any(axis=1);t=unowned.argmax(axis=1)
                old,has_old=focus();t=np.where(has_new,t,old)
                eligible=selectable&(has_new|has_old)
                award_full(t,eligible);marks[eligible]-=exchange_cost
            settle()
        settle()
        assert (shards>=0).all() and (universal>=0).all() and ((stars>=0)&(stars<=5)).all()
        first5[(first5==0)&(stars[:,0]==5)]=session_count
        completion[(completion==0)&(stars>0).all(axis=1)]=day
        maxcompletion[(maxcompletion==0)&(stars==5).all(axis=1)]=day
        if day in [1,28,90,180,365]:
            snapshots[day]={'pulls':total,'owned_median':float(np.median((stars>0).sum(axis=1))),'owned_p10':float(np.percentile((stars>0).sum(axis=1),10)), 'max5_median':float(np.median((stars==5).sum(axis=1))), 'all_owned_pct':round(float(((stars>0).all(axis=1)).mean()*100),2),'all_max_pct':round(float(((stars==5).all(axis=1)).mean()*100),2),'universal_median':float(np.median(universal)),'marks_median':float(np.median(marks))}
    def q(a):
        z=a[a>0];return {'median':float(np.median(z)),'p90':float(np.percentile(z,90)),'completed_pct':round(float((a>0).mean()*100),2)} if len(z) else None
    return {'label':label,'shard_min':shard_min,'shard_max':shard_max,'bootstrap_factor':bootstrap_factor,'exchange_cost':exchange_cost,'players':N,'p_full':p,'free28':free28,'paid30':paid30,'farm20_per_session':farm,'sessions_week':sessions_week,'first_favorite_max_sessions':q(first5),'collection_days':q(completion),'all_max_days':q(maxcompletion),'snapshots':snapshots}


if __name__ == '__main__':
    import argparse, csv, platform
    from pathlib import Path
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--players',type=int,default=8000)
    parser.add_argument('--days',type=int,default=365)
    parser.add_argument('--scenarios',type=Path,default=Path(__file__).with_name('scenarios.json'))
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    if args.players<1 or args.days<1:parser.error('players and days must be positive')
    N=args.players
    cases=json.loads(args.scenarios.read_text())
    results=[]
    for case in cases:
        result=simulate(**case,days=args.days)
        results.append(result)
        print(json.dumps({k:result[k] for k in ['label','collection_days','all_max_days']},ensure_ascii=False),flush=True)
    args.output.mkdir(parents=True,exist_ok=True)
    payload={'metadata':{'seed':20261108,'players_per_case':N,'days':args.days,'numpy':np.__version__,'python':platform.python_version(),'proposal_only':True},'results':results}
    (args.output/'results.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
    def population_quantile(result,field,q):
        stat=result[field]
        if stat is None:return ''
        # Quantiles above the completed fraction are right-censored, not "completed-only" estimates.
        if stat['completed_pct']<100:return ''
        return stat[q]
    with (args.output/'summary.csv').open('w',newline='') as file:
        writer=csv.writer(file,lineterminator="\n")
        writer.writerow(['case','free_per28','paid_per30','exchange_cost','p_full','shard_min','shard_max','collection_median_days','collection_p90_days','collection_completion_pct','allmax_median_days','allmax_p90_days','allmax_completion_pct'])
        for r in results:
            writer.writerow([r['label'],r['free28'],r['paid30'],r['exchange_cost'],r['p_full'],r['shard_min'],r['shard_max'],population_quantile(r,'collection_days','median'),population_quantile(r,'collection_days','p90'),r['collection_days']['completed_pct'] if r['collection_days'] else 0,population_quantile(r,'all_max_days','median'),population_quantile(r,'all_max_days','p90'),r['all_max_days']['completed_pct'] if r['all_max_days'] else 0])
