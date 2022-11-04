import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { INestApplication } from '@nestjs/common';
import { getConnection, Repository } from 'typeorm';
import { User, UserRole } from '../src/users/entities/user.entity';
import { Podcast } from '../src/podcast/entities/podcast.entity';
import { Episode } from '../src/podcast/entities/episode.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PodcastsService } from '../src/podcast/podcasts.service';
import { UsersService } from '../src/users/users.service';
import { CreatePodcastInput } from '../src/podcast/dtos/create-podcast.dto';
import { UpdateEpisodeInput } from '../src/podcast/dtos/update-episode.dto';
import { UpdatePodcastInput } from '../src/podcast/dtos/update-podcast.dto';
import { CreateEpisodeInput } from '../src/podcast/dtos/create-episode.dto';
import { EpisodesSearchInput } from '../src/podcast/dtos/podcast.dto';
import { CreateAccountInput } from '../src/users/dtos/create-account.dto';
import { JwtService } from '../src/jwt/jwt.service';
import { EditProfileInput } from '../src/users/dtos/edit-profile.dto';

const GRAPHQL_ENDPOINT = '/graphql';

const InternalServerErrorOutput = {
  ok: false,
  error: 'Internal server error occurred.',
};
const SOMETHING_ERROR = { ok: false, error: 'Something Error' };

describe('App (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let podcastRepository: Repository<Podcast>;
  let episodeRepository: Repository<Episode>;
  let podcastService: PodcastsService;
  let usersService: UsersService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    podcastRepository = module.get<Repository<Podcast>>(
      getRepositoryToken(Podcast),
    );
    episodeRepository = module.get<Repository<Episode>>(
      getRepositoryToken(Episode),
    );
    podcastService = module.get(PodcastsService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    app = module.createNestApplication();
    await app.init();

    const PODCAST_1 = {
      title: 'po1',
      category: 'category',
      rating: 1,
    };
    const PODCAST_2 = {
      title: 'po2',
      category: 'category',
      rating: 2,
    };

    const EPISODE_1 = {
      title: 'ep1',
      category: 'category',
      podcast: PODCAST_1,
    };
    const EPISODE_2 = {
      title: 'ep2',
      category: 'category',
      podcast: PODCAST_2,
    };
    await podcastRepository.save([PODCAST_1, PODCAST_2]);
    await episodeRepository.save([EPISODE_1, EPISODE_2]);
  });

  afterAll(async () => {
    await getConnection().dropDatabase();
    await app.close();
  });

  const baseTest = (query: string) =>
    request(app.getHttpServer()).post(GRAPHQL_ENDPOINT).send({ query });
  let jwtToken: string;
  const authUserTest = (query: string) =>
    request(app.getHttpServer())
      .post(GRAPHQL_ENDPOINT)
      .set('X-JWT', jwtToken)
      .send({ query });

  describe('Podcasts Resolver', () => {
    describe('getAllPodcasts', () => {
      const query = `{
            getAllPodcasts{
              ok
              error
              podcasts{
                id
              }
            }
          }`;
      it('should get All Podcasts', () => {
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  getAllPodcasts: { ok, error, podcasts },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
            let id = 1;
            podcasts.forEach(podcast => {
              expect(podcast.id).toBe(id);
              id++;
            });
          });
      });
      it('should fail to get Podcasts if internal server error invoked', async () => {
        jest
          .spyOn(podcastRepository, 'find')
          .mockRejectedValueOnce(new Error());
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  getAllPodcasts: { ok, error, podcasts },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe(InternalServerErrorOutput.error);
            expect(podcasts).toBe(null);
          });
      });
    });
    describe('getPodcast', () => {
      const podcastId = 1;
      const query = `{
        getPodcast(input:{id:${podcastId}}){
          ok
          error
          podcast{
            id
          }
        }
      }`;
      it('should get a podcast', () => {
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  getPodcast: { ok, error, podcast },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
            expect(podcast.id).toBe(1);
          });
      });
      it('should fail if podcast not found', () => {
        jest
          .spyOn(podcastRepository, 'findOne')
          .mockResolvedValueOnce(undefined);
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  getPodcast: { ok, error, podcast },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe(`Podcast with id ${podcastId} not found`);
            expect(podcast).toBe(null);
          });
      });
      it('should fail to get a Podcast if internal server error invoked', () => {
        jest
          .spyOn(podcastRepository, 'findOne')
          .mockRejectedValueOnce(new Error());
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  getPodcast: { ok, error, podcast },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe(InternalServerErrorOutput.error);
            expect(podcast).toBe(null);
          });
      });
    });
    describe('getEpisodes', () => {
      const podcastId = 1;
      const query = `{
        getEpisodes(input: {id: ${podcastId}}){
          ok
          error
          episodes{
            id
          }
        }
      }`;
      it('should return a episodes', () => {
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  getEpisodes: { ok, error, episodes },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
            let id = 1;
            episodes.forEach(episode => {
              expect(episode.id).toBe(id);
              id++;
            });
          });
      });

      it('should fail if error occurred', () => {
        jest
          .spyOn(podcastService, 'getPodcast')
          .mockResolvedValueOnce(SOMETHING_ERROR);
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  getEpisodes: { ok, error, episodes },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe('Something Error');
            expect(episodes).toBe(null);
          });
      });
    });
    describe('createPodcast', () => {
      const { title, category }: CreatePodcastInput = {
        title: 'po3',
        category: 'category',
      };
      const query = `mutation{
        createPodcast(input: {title: "${title}", category: "${category}"}){
          ok
          id
          error
        }
      }`;
      it('should create podcast', () => {
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  createPodcast: { ok, id, error },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(id).toBe(3);
            expect(error).toBe(null);
          })
          .then(async () => {
            const find = await podcastRepository.findOne({ where: { id: 3 } });
            expect(find.id).toBe(3);
          });
      });

      it('should fail to create Podcast if internal server error invoked', () => {
        jest
          .spyOn(podcastRepository, 'save')
          .mockRejectedValueOnce(new Error());
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  createPodcast: { ok, id, error },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(id).toBe(null);
            expect(error).toBe(InternalServerErrorOutput.error);
          })
          .then(async () => {
            const find = await podcastRepository.findOne({ where: { id: 4 } });
            expect(find).toBe(undefined);
          });
      });
    });
    describe('deletePodcast', () => {
      let podcastId = 1;
      let query = `mutation{
        deletePodcast(input: {id: ${podcastId}}){
          ok
          error
        }
      }`;
      it('should delete podcast', async () => {
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  deletePodcast: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
          })
          .then(async () => {
            const find = await podcastRepository.findOne({
              where: { id: podcastId },
            });
            expect(find).toBe(undefined);
          });
      });

      it('should fail if get podcast error', async () => {
        jest
          .spyOn(podcastService, 'getPodcast')
          .mockResolvedValueOnce(SOMETHING_ERROR);
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  deletePodcast: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe(SOMETHING_ERROR.error);
          });
      });

      it('should fail to delete Podcast if internal server error invoked', async () => {
        podcastId = 2;
        query = `mutation{
        deletePodcast(input: {id: ${podcastId}}){
          ok
          error
        }
      }`;
        jest
          .spyOn(podcastRepository, 'delete')
          .mockRejectedValueOnce(new Error());
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  deletePodcast: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe(InternalServerErrorOutput.error);
          });
      });
    });
    describe('updatePodcast', () => {
      const {
        id,
        payload: { title, category, rating },
      }: UpdatePodcastInput = {
        id: 2,
        payload: {
          title: 'new_po_title',
          category: 'new_category',
          rating: 3,
        },
      };
      const query = `mutation{
        updatePodcast(input: {id: ${id}, payload: {title: "${title}", category:"${category}", rating: ${rating}}}){
          ok
          error
        }
      }`;
      it('should update a podcast', () => {
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  updatePodcast: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
          });
      });

      it('should fail if get podcast error', () => {
        jest
          .spyOn(podcastService, 'getPodcast')
          .mockResolvedValueOnce(SOMETHING_ERROR);
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  updatePodcast: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe(SOMETHING_ERROR.error);
          });
      });

      it('should fail to update if rating value is invalid', () => {
        const invalidRatingQuery = `mutation{
            updatePodcast(input: {id: ${id}, payload: {title: "${title}", category:"${category}", rating: 6}}){
              ok
              error
            }
          }`;
        return baseTest(invalidRatingQuery)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  updatePodcast: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe('Rating must be between 1 and 5.');
          });
      });

      it('should fail to update Podcast if internal server error invoked', () => {
        jest
          .spyOn(podcastRepository, 'save')
          .mockRejectedValueOnce(new Error());
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  updatePodcast: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe(InternalServerErrorOutput.error);
          });
      });
    });
    describe('createEpisode', () => {
      const { podcastId, title, category }: CreateEpisodeInput = {
        podcastId: 2,
        title: 'ep3',
        category: 'category',
      };
      const query = `mutation{
        createEpisode(input:{podcastId: ${podcastId}, title: "${title}", category: "${category}"}){
          ok
          id
          error
        }
      }`;
      it('should create episode', () => {
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  createEpisode: { ok, id, error },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(id).toBe(3);
            expect(error).toBe(null);
          })
          .then(async () => {
            const find = await episodeRepository.findOne({ where: { id: 3 } });
            expect(find.id).toBe(3);
          });
      });

      it('should fail if get podcast error', async () => {
        jest
          .spyOn(podcastService, 'getPodcast')
          .mockResolvedValueOnce(SOMETHING_ERROR);
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  createEpisode: { ok, id, error },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(id).toBe(null);
            expect(error).toBe(SOMETHING_ERROR.error);
          });
      });

      it('should fail to create Episode if internal server error invoked', async () => {
        jest
          .spyOn(episodeRepository, 'save')
          .mockRejectedValueOnce(new Error());
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  createEpisode: { ok, id, error },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(id).toBe(null);
            expect(error).toBe(InternalServerErrorOutput.error);
          });
      });
    });
    describe('updateEpisode', () => {
      const { podcastId, episodeId, title, category }: UpdateEpisodeInput = {
        podcastId: 2,
        episodeId: 3,
        title: 'new_ep_title',
        category: 'new_category',
      };
      const query = `mutation{
        updateEpisode(input:{podcastId: ${podcastId}, episodeId: ${episodeId}, title: "${title}", category: "${category}"}){
          ok
          error
        }
      }`;

      it('should update episode', () => {
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  updateEpisode: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
          })
          .then(async () => {
            const find = await episodeRepository.findOne({
              where: { id: episodeId },
            });
            expect(find.title).toBe(title);
            expect(find.category).toBe(category);
          });
      });

      it('should fail if get episode error', async () => {
        jest
          .spyOn(podcastService, 'getEpisode')
          .mockResolvedValueOnce(SOMETHING_ERROR);
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  updateEpisode: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe(SOMETHING_ERROR.error);
          });
      });

      it('should fail to update episode if internal server error invoked', async () => {
        jest
          .spyOn(episodeRepository, 'save')
          .mockRejectedValueOnce(new Error());
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  updateEpisode: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe(InternalServerErrorOutput.error);
          });
      });
    });
    describe('deleteEpisode', () => {
      const { podcastId, episodeId }: EpisodesSearchInput = {
        podcastId: 2,
        episodeId: 3,
      };
      let query = `mutation{
        deleteEpisode(input: { podcastId: ${podcastId}, episodeId:${episodeId}}){
          ok
          error
        }
      }`;

      it('should delete episode', async () => {
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  deleteEpisode: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
          })
          .then(async () => {
            const find = await episodeRepository.findOne({
              where: { id: episodeId },
            });
            expect(find).toBe(undefined);
          });
      });

      it('should fail if get episode error', async () => {
        jest
          .spyOn(podcastService, 'getEpisode')
          .mockResolvedValueOnce(SOMETHING_ERROR);
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  deleteEpisode: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe(SOMETHING_ERROR.error);
          });
      });

      it('should fail to delete Episode if internal server error invoked', async () => {
        query = `mutation{
            deleteEpisode(input: { podcastId: ${podcastId}, episodeId: 2}){
              ok
              error
            }
          }`;
        jest
          .spyOn(episodeRepository, 'delete')
          .mockRejectedValueOnce(new Error());
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  deleteEpisode: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe(InternalServerErrorOutput.error);
          });
      });
    });
  });
  describe('Users Resolver', () => {
    const { email, password, role }: CreateAccountInput = {
      email: 'test@mail.com',
      password: 'password',
      role: UserRole.Listener,
    };
    describe('createAccount', () => {
      let query = `mutation{
        createAccount(input: {email: "${email}", password: "${password}", role: ${role} }){
          ok
          error
        }
      }`;
      it('should create account', () => {
        jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(undefined);
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  createAccount: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
          });
      });

      it('should fail to create account if same email already exists', () => {
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  createAccount: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe('There is a user with that email already');
          });
      });

      it('should create account', () => {
        query = `mutation{
        createAccount(input: {email: "another@mail.com", password: "${password}", role: ${role} }){
          ok
          error
        }
      }`;
        jest.spyOn(userRepository, 'save').mockRejectedValueOnce(new Error());
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  createAccount: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe('Could not create account');
          });
      });
    });
    describe('login', () => {
      let query = `mutation{
        login(input: {email: "${email}", password: "${password}"}){
          ok
          error
          token
        }
      }`;
      it('should success login and get token', () => {
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  login: { ok, error, token },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
            expect(token).toEqual(expect.any(String));
            jwtToken = token;
          });
      });

      it('should fail if user not found', () => {
        jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(undefined);
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  login: { ok, error, token },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe('User not found');
            expect(token).toBe(null);
          });
      });

      it('should fail if something error occurred', () => {
        jest
          .spyOn(userRepository, 'findOne')
          .mockRejectedValueOnce(new Error('Something error'));
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  login: { ok, error, token },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe(null);
            expect(token).toBe(null);
          });
      });

      it('should fail if password wrong', () => {
        query = `mutation{
          login(input: {email: "${email}", password: "wrongPaxxword"}){
            ok
            error
            token
          }
        }`;
        return baseTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  login: { ok, error, token },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe('Wrong password');
            expect(token).toBe(null);
          });
      });
    });
    describe('me', () => {
      const query = `{
        me{
          id
        }
      }`;
      it('should return auth user', () => {
        return authUserTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  me: { id },
                },
              },
            } = res;
            expect(id).toBe(1);
          });
      });
    });
    describe('seeProfile', () => {
      let findUserId = 1;
      let query = `{
        seeProfile(${findUserId}){
          ok
          error
          user{
            id
          }
        }
      }`;

      it('should see profile', () => {
        authUserTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  seeProfile: {
                    ok,
                    error,
                    user: { id },
                  },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
            expect(id).toBe(1);
          });
      });

      it('should fail if user not exists', () => {
        findUserId = 99;
        query = `{
        seeProfile(${findUserId}){
          ok
          error
          user{
            id
          }
        }
      }`;
        authUserTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  seeProfile: {
                    ok,
                    error,
                    user: { id },
                  },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe('User Not Found');
            expect(id).toBe(null);
          });
      });
    });
    describe('editProfile', () => {
      const { newEmail, newPassword } = {
        newEmail: 'newMail@mail.com',
        newPassword: 'newPassword',
      };
      const query = `mutation{
        editProfile(input:{email: "${newEmail}", password: "${newPassword}"}){
          ok
          error
        }
      }`;

      // it('should fail if user not exists', () => {
      //   jest
      //     .spyOn(userRepository, 'findOneOrFail')
      //     .mockRejectedValueOnce(new Error());
      //   return authUserTest(query)
      //     .expect(200)
      //     .expect(res => {
      //       const {
      //         body: {
      //           data: {
      //             editProfile: { ok, error },
      //           },
      //         },
      //       } = res;
      //       expect(ok).toBe(false);
      //       expect(error).toBe('Could not update profile');
      //     });
      // });

      it('should fail if database save error', () => {
        jest.spyOn(userRepository, 'save').mockRejectedValueOnce(new Error());
        return authUserTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  editProfile: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(false);
            expect(error).toBe('Could not update profile');
          });
      });
      it('should update profile', () => {
        return authUserTest(query)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: {
                  editProfile: { ok, error },
                },
              },
            } = res;
            expect(ok).toBe(true);
            expect(error).toBe(null);
          });
      });
    });
  });
});
