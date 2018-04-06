import { observable, computed } from 'mobx';
import * as _ from 'lodash';

export interface Chromosome {
    name: string;
    matchName: string;
    chromosome: number;
    locationStart: number;
    locationEnd: number;
    centimorgans: number;
}

export interface Match {
    matchName: string;
    centimorgans: number;
    chromosomes: Array<Chromosome>;
    commonChromosomes?: Map<Match, Chromosome[]>;
}

export default class ChromosomeStore {
    @observable minCentimorgans: number = 7;
    @observable chromosomes: Array<Chromosome> = [];
    @observable showSharedChromosomes: boolean = false;

    @computed get filteredChromosomes(): Array<Chromosome> {
        return _.filter(this.chromosomes, x => x.centimorgans >= this.minCentimorgans);
    }

    @computed get isReady(): boolean {
        return this.chromosomes.length > 0;
    }

    @computed get matches(): Array<Match> {
        var grouped = _.groupBy(this.filteredChromosomes, x => x.matchName);
        var result = [];
        let root = this;

        _.forEach(grouped, (item, key) => {
            let centimorgans = _.sumBy(_.filter(item, x => Number(x.centimorgans) >= root.minCentimorgans), x => Number(x.centimorgans));
            result.push({
                matchName: key,
                chromosomes: item,
                centimorgans: _.round(centimorgans, 1)
            });
        });

        return result;
    }

    populateMatchesWithMatrix () {
        var matrix = this.buildMatrix();

        _.forEach(this.matches, match => {
            match.commonChromosomes = matrix.get(match);
        })

        this.showSharedChromosomes = true;
    }

    buildMatrix (): Map<Match, Map<Match,Chromosome[]>> {
        let root = this;
        var outerMap = new Map<Match, Map<Match,Chromosome[]>>();

        this.matches.forEach(matchA => {
            var innerMap = new Map<Match, Chromosome[]>();
            this.matches.forEach(matchB => {
                if (matchA !== matchB) {
                    var matchBMap = outerMap.get(matchB);
                    var chromosomes = matchBMap && matchBMap.get(matchA);

                    if (!chromosomes) {
                        chromosomes = _.filter(matchB.chromosomes, chromosomeA => {
                            return _.some(matchA.chromosomes, chromosomeB => {
                                return chromosomeA.chromosome === chromosomeB.chromosome &&
                                    chromosomeA.centimorgans >= root.minCentimorgans &&
                                    chromosomeB.centimorgans >= root.minCentimorgans &&
                                    ((chromosomeA.locationStart >= chromosomeB.locationStart && 
                                    chromosomeA.locationStart <= chromosomeB.locationEnd ) ||
                                    (chromosomeB.locationStart >= chromosomeA.locationStart && 
                                        chromosomeB.locationStart <= chromosomeA.locationEnd));
                            });
                        });
                    }

                    innerMap.set(matchB, chromosomes);
                }
            });
            outerMap.set(matchA, innerMap);
        });

        return outerMap;
    }
}