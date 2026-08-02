import MovieCard from "./MovieCard";

type Movie = {
  id:number;
  title:string;
  genre:string;
  year:string;
  image:string;
};

export default function MovieRow({
  title,
  movies,
}:{
  title:string;
  movies:Movie[];
}){

  return(

    <section className="mx-auto max-w-7xl px-4 py-12">

      <h3 className="mb-6 text-2xl font-light">
        {title}
      </h3>

      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">

        {movies.map(movie=>(
          <MovieCard
            key={movie.id}
            {...movie}
          />
        ))}

      </div>

    </section>

  );

}
