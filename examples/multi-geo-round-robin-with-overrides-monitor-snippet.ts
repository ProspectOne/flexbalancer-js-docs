//Definition for our answer type
type TAnswer =
    {
        name: string,
        cname: string,
        monitor?: TMonitor
    };

//List of answers
const answers: TAnswer[] = [
    {
        name: 'first',
        cname: 'www.first.com',
        monitor: 304
    },
    {
        name: 'second',
        cname: 'www.second.com',
        monitor: 305
    },
    {
        name: 'third',
        cname: 'www.third.com'
    },
    {
        name: 'fourth',
        cname: 'www.fourth.com'
    }
];

//Default answer that will be returned
//if no acceptable candidate will be found
const defaultAnswer: string = "fourth";

//Rules that will define answer accordint to country
//from which request was made
const countriesAnswersRoundRobin = {
    'PL': ['first','second'],
    'JP': ['third']
};

//Function return random object element
const getRandomElement = (object) => {
    return object[Math.floor(Math.random() * Object.keys(object).length)];
};

//Add answer as candidate if it doesnt have monitor
const requireMonitorData: boolean = false;

//Filter function to check is provided answer is acceptable by checking its monitor
//or if there are no monitor and requireMonitorData is set to true then it will count as acceptable
const isProperCandidate = (candidate: TAnswer) => {
    if (candidate.monitor) {
        if (isMonitorOnline(candidate.monitor)) {
            return true;
        }
    } else if (requireMonitorData) {
        return true;
    }
    return  false;
};

async function onRequest(request: IRequest, response: IResponse) {
    //End list of candidates of answers
    let candidates: object[] = [];
    //Country where request was made from
    let requestCountry = request.location.country;

    //Checking did we managed to detect country,
    //does our country listed in countriesAnswersRoundRobin list
    //and does it contains any answers
    if (requestCountry &&
        countriesAnswersRoundRobin[requestCountry] &&
        countriesAnswersRoundRobin[requestCountry].length) {

        countriesAnswersRoundRobin[requestCountry].forEach( (answerName) => {
            //Collect all the answers
            let geoCandidates = answers.filter((answerCheck) =>  {
                return (answerCheck.name === answerName);
            });

            if (geoCandidates.length) {
                //Filter geo answers by defined earlier monitors check
                geoCandidates.filter(isProperCandidate).forEach( (filtered) => {
                    //Save answers for later use
                    candidates.push(filtered);
                });
            }
        });
    }

    //If we found proper geo candidates, return one of them by random
    if (candidates.length) {
        response.addr = getRandomElement(candidates).cname;
        return response;
    }

    //If there was no geo candidates, we choose new ones from whole list by monitor filter
    candidates = answers.filter(isProperCandidate);

    //Choose random candidate as response if we have any
    if (candidates.length) {
        response.addr = getRandomElement(candidates).cname;
        return response;
    }

    let setDefaultAnswer = answers.find(answer => answer.name === defaultAnswer);

    //Set default as response
    if (setDefaultAnswer) {
        response.addr = setDefaultAnswer.cname;
        return response;
    }

    return response;
}
